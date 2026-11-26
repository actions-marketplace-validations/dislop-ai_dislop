import { definePackScripts, maskInlineCode } from "dislop/sdk";

const PURE_FILLER_ZH_SENTENCES = [
  /^在当今[^，。！？\n]{2,20}的(?:时代)?(?:浪潮|背景|时代|大背景|趋势)下[，,]\s*(?:这一举措|这|它)?(?:无疑)?具有[^。！？\n]{2,24}[。！？]$/,
  /^随着[^，。！？\n]{2,18}的(?:不断深入|飞速发展|持续演进|日益普及)[，,]\s*[^。！？\n]{2,24}已成(?:为)?必然趋势[。！？]$/,
  /^展望未来[，,]\s*我们将继续[^。！？\n]{2,30}[。！？]$/,
  /^总而言之[，,]\s*这不仅标志着新的起点[，,]\s*更为未来[^。！？\n]{2,24}[。！？]$/,
];

const THROAT_CLEARING_ZH_PREFIXES = [
  /^(?:值得注意的是[，,]\s*|需要指出的是[，,]\s*|毋庸置疑[，,]\s*|众所周知[，,]\s*)/,
];

const STANDALONE_SELF_QA_ZH_RE =
  /^(?:为什么这(?:一点|件事)?(?:如此|这么)?重要[？?]|这意味着什么[？?]|背后原因是什么[？?])$/;

const MECHANICAL_SELF_QA_ZH_RE =
  /^(?:答案很简单[：:—-]\s*|究其原因[，,：:]\s*|简而言之[，,]\s*答案就是)/;

const SINGLE_SEG_SELF_QA_ZH_RE =
  /^这意味着什么[？?]\s*(?:意味着|说明)?(.+)$/;

const FOUR_CHAR_TRIAD_RE =
  /(?:精准高效|安全可靠|灵活易用|全面赋能|协同联动|稳步推进|持续优化|深度融合|多维驱动|闭环管理)(?:[、，,]\s*(?:精准高效|安全可靠|灵活易用|全面赋能|协同联动|稳步推进|持续优化|深度融合|多维驱动|闭环管理)){2,}/;

const ZH_MORALIZING_CLOSER_RE =
  /^(?:这或许就是[^。！？\n]{2,24}在[^。！？\n]{2,16}时代真正的意义所在|归根结底[，,]\s*[^，。！？\n]{2,18}从来不是[^，。！？\n]{2,18}[，,]\s*而是[^。！？\n]{2,24})[。！？]$/;

const ZH_BUZZWORD_POOL = [
  "抓手",
  "赋能",
  "闭环",
  "底座",
  "心智",
  "组合拳",
  "跃迁",
  "破局",
  "矩阵",
  "势能",
];

const ZH_HALFWIDTH_CJK_PUNCT_RE = /(?<=[\u4e00-\u9fff])([,;])(?=[\u4e00-\u9fff])/g;

const SECOND_ORDER_ZH_SLOGAN_RE =
  /(?:不是|并非)(?:单纯的?|简单的?)?[^，。；\n]{1,20}[，,]\s*而是(?:一场|一次)?[^。！？\n]{1,28}/;

function maskInlineAndUrls(text) {
  return maskInlineCode(text).replace(/https?:\/\/[^\s)>\]"']+/gi, (m) => " ".repeat(m.length));
}

export default definePackScripts({
  check(doc, ctx) {
    let consecutiveBoldListItems = 0;
    let boldWallAnchorSeg = null;

    for (const seg of doc.segments) {
      const text = seg.text.trim();
      const masked = maskInlineCode(text);
      const isHeading = seg.blockKind === "heading";

      if (!isHeading && PURE_FILLER_ZH_SENTENCES.some((re) => re.test(masked))) {
        ctx.reportSuggestion({
          ruleId: "hollow-transition",
          priority: "strong",
          fixSafety: "safe",
          actionType: "delete",
          targetId: seg.id,
          line: seg.line,
          originalQuote: seg.text,
          suggestedReplacement: "",
          reason: "零信息增量的宏大叙事套话，执行破坏性删除测试后不影响上下文事实与因果推进。",
        });
        continue;
      }

      if (!isHeading) {
        for (const prefixRe of THROAT_CLEARING_ZH_PREFIXES) {
          const m = masked.match(prefixRe);
          if (m && text.length > m[0].length + 6) {
            ctx.reportSuggestion({
              ruleId: "throat-clearing",
              priority: "moderate",
              fixSafety: "safe",
              actionType: "replace",
              targetId: seg.id,
              line: seg.line,
              originalQuote: seg.text,
              suggestedReplacement: text.slice(m[0].length),
              reason: "删去无实质信息的句首套话铺垫，直接进入具体陈述。",
            });
            break;
          }
        }
      }

      if (!isHeading && STANDALONE_SELF_QA_ZH_RE.test(masked)) {
        ctx.reportSuggestion({
          ruleId: "rhetorical-self-qa",
          priority: "moderate",
          fixSafety: "review",
          actionType: "delete",
          targetId: seg.id,
          line: seg.line,
          originalQuote: seg.text,
          suggestedReplacement: "",
          reason: "移除机械的助手式自问过渡句，让后一句直接给出结论。",
        });
        continue;
      }

      if (!isHeading && MECHANICAL_SELF_QA_ZH_RE.test(masked) && text.length > 8) {
        const stripped = text.replace(MECHANICAL_SELF_QA_ZH_RE, "");
        if (stripped && stripped !== text) {
          ctx.reportSuggestion({
            ruleId: "rhetorical-self-qa",
            priority: "moderate",
            fixSafety: "review",
            actionType: "replace",
            targetId: seg.id,
            line: seg.line,
            originalQuote: seg.text,
            suggestedReplacement: stripped,
            reason: "去掉机械的助手式自问自答过渡壳，直接陈述结论。",
          });
        }
      } else if (!isHeading) {
        const singleQa = masked.match(SINGLE_SEG_SELF_QA_ZH_RE);
        if (singleQa) {
          const rhsStart = masked.length - singleQa[1].length;
          ctx.reportSuggestion({
            ruleId: "rhetorical-self-qa",
            priority: "moderate",
            fixSafety: "review",
            actionType: "replace",
            targetId: seg.id,
            line: seg.line,
            originalQuote: seg.text,
            suggestedReplacement: text.slice(rhsStart),
            reason: "去掉机械的“这意味着什么？”自问自答壳，直接写出具体影响。",
          });
        }
      }

      const pivotMatch = masked.match(
        /^这(?:不是|并非|绝非)(?:一次|一场)?(?:单纯的?|简单的?|普通的?|仅仅)[^，,；\n]{1,24}[，,]\s*而是(.+)$/,
      );
      if (pivotMatch) {
        const rhsStart = masked.length - pivotMatch[1].length;
        const rhs = text.slice(rhsStart).trim();
        const startsWithVerb = /^(?:说明|意味着|代表|要求|体现|把|将|让)/.test(rhs);
        ctx.reportSuggestion({
          ruleId: "unprompted-negation",
          priority: "strong",
          fixSafety: "review",
          actionType: "replace",
          targetId: seg.id,
          line: seg.line,
          originalQuote: seg.text,
          suggestedReplacement: startsWithVerb ? rhs : `这是${rhs}`,
          reason: "移除无前文语境支撑的“不是…而是…”伪深刻对比壳，直接陈述后半句内容。",
        });
      } else {
        const aphorismPivot = masked.match(
          /[^，。；\n]{2,28}(?:不是|并非|绝非)[^，,；\n]{2,18}[，,]\s*而是[^。！？\n]*(?:跃迁|重塑|重构|革命|范式|新纪元|蜕变|升华|真正的意义|岁月里的尊严)[^。！？\n]*[。！？]?$/,
        );
        if (aphorismPivot) {
          ctx.reportSuggestion({
            ruleId: "unprompted-negation",
            priority: "strong",
            fixSafety: "manual",
            actionType: "prompt",
            targetId: seg.id,
            line: seg.line,
            originalQuote: seg.text,
            reason: "“不是 A，而是 B（拔高/跃迁）”属于典型模板化金句转折，建议改为具体事实陈述。",
            rewritePrompt: "删去“不是…而是…”抽象升华对比，改为具体细节或可验证事实。",
          });
        }
      }

      if (!isHeading && ZH_MORALIZING_CLOSER_RE.test(masked)) {
        ctx.reportSuggestion({
          ruleId: "moralizing-closer",
          priority: "moderate",
          fixSafety: "review",
          actionType: "delete",
          targetId: seg.id,
          line: seg.line,
          originalQuote: seg.text,
          suggestedReplacement: "",
          reason: "文末说教或拔高式感叹收尾未补充具体信息或行动建议，删去更利落。",
        });
      }

      const triadMatch = masked.match(FOUR_CHAR_TRIAD_RE);
      if (triadMatch) {
        const hitQuote = text.slice(triadMatch.index, triadMatch.index + triadMatch[0].length);
        ctx.reportSuggestion({
          ruleId: "four-char-slogan-triad",
          priority: "moderate",
          fixSafety: "manual",
          actionType: "prompt",
          targetId: seg.id,
          line: seg.line,
          originalQuote: hitQuote,
          reason: "连续堆砌三个及以上空洞四字套话排比，缺乏具体动作或边界信息。",
          rewritePrompt: "删去四字口号排比串，保留或改写为原文中实际发生的具体改动：[填入具体机制或动作]",
        });
      }

      const punctMasked = maskInlineAndUrls(text);
      const halfwidthHits = punctMasked.match(ZH_HALFWIDTH_CJK_PUNCT_RE);
      if (halfwidthHits && halfwidthHits.length >= 2) {
        let fixed = "";
        for (let i = 0; i < text.length; i += 1) {
          if (
            (text[i] === "," || text[i] === ";") &&
            punctMasked[i] === text[i] &&
            i > 0 &&
            i + 1 < text.length &&
            /[\u4e00-\u9fff]/.test(text[i - 1]) &&
            /[\u4e00-\u9fff]/.test(text[i + 1])
          ) {
            fixed += text[i] === "," ? "\uff0c" : "\uff1b";
          } else {
            fixed += text[i];
          }
        }
        if (fixed !== text) {
          ctx.reportSuggestion({
            ruleId: "halfwidth-cjk-punctuation",
            priority: "moderate",
            fixSafety: "safe",
            actionType: "replace",
            targetId: seg.id,
            line: seg.line,
            originalQuote: seg.text,
            suggestedReplacement: fixed,
            reason: "中文正文句子间混用了半角英文逗号或分号，统一为全角中文标点。",
          });
        }
      }

      if (seg.id.endsWith("-S1") && seg.blockKind === "list-item") {
        const boldMatch = text.match(/^\*\*([\u4e00-\u9fff]{2,6})\*\*\s*[：:—-]/);
        if (boldMatch && !/(?:--|`)/.test(text)) {
          consecutiveBoldListItems += 1;
          if (consecutiveBoldListItems === 1) boldWallAnchorSeg = seg;
          if (consecutiveBoldListItems === 4 && boldWallAnchorSeg) {
            ctx.reportSuggestion({
              ruleId: "bold-lead-list-wall",
              priority: "hint",
              fixSafety: "manual",
              actionType: "prompt",
              targetId: boldWallAnchorSeg.id,
              line: boldWallAnchorSeg.line,
              originalQuote: boldWallAnchorSeg.text,
              reason: "连续四条及以上使用“**抽象词**：说明”机械加粗列表，呈现明显助手生成模板感。",
              rewritePrompt: "去掉重复的加粗前缀标签，改写为直接陈述事实的普通列表或自然段落。",
            });
          }
        } else {
          consecutiveBoldListItems = 0;
          boldWallAnchorSeg = null;
        }
      } else if (seg.id.endsWith("-S1")) {
        consecutiveBoldListItems = 0;
        boldWallAnchorSeg = null;
      }
    }

    for (const para of doc.paragraphs || []) {
      // Mask inline code and quoted specimen spans ("..." / 「...」) so citing negative examples never fires
      const unquotedPara = maskInlineCode(para.text)
        .replace(/“[^”\n]{1,40}”/g, " ")
        .replace(/「[^」\n]{1,40}」/g, " ");
      const hitTerms = ZH_BUZZWORD_POOL.filter((term) => unquotedPara.includes(term));
      if (hitTerms.length >= 3) {
        const anchorSegId = para.segmentIds?.[0] || null;
        ctx.reportSuggestion({
          ruleId: "buzzword-cluster",
          priority: "moderate",
          fixSafety: "manual",
          actionType: "prompt",
          targetId: anchorSegId,
          line: para.line,
          originalQuote: para.text.slice(0, 120),
          reason: `同一段落密集堆砌了 ${hitTerms.length} 个空泛黑话词（${hitTerms.join("、")}），挤占了具体机制描述。`,
          rewritePrompt: "去掉黑话词，改用具体动作、模块名称或可验证结果描述改动。",
        });
      }
    }
  },

  verifyFix(_issue, candidateText) {
    if (candidateText && SECOND_ORDER_ZH_SLOGAN_RE.test(candidateText)) {
      return {
        ok: false,
        reason: "改写结果引入了“不是…而是…”二阶口号转折句式。",
      };
    }
    return { ok: true };
  },
});
