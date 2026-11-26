---
roleHint: "适用范围：克制的中文书面语去 AI 味识别。普通业务陈述句即使包含常见抽象动词也不得误报。"
rules:
  - id: unprompted-negation
    priority: strong
  - id: hollow-transition
    priority: strong
  - id: throat-clearing
    priority: moderate
  - id: moralizing-closer
    priority: moderate
  - id: rhetorical-self-qa
    priority: hint
  - id: stealth-vapor
    priority: moderate
  - id: cooccurrence-padding
    priority: moderate
---

1. **unprompted-negation**: 当上文从未提及或暗示对立面 A，却生硬套用“不是 A，而是 B”或“并非单纯的 A，而是一场 B”伪深刻对比句壳时触发。前文确实存在旧观念或误解需澄清时不触发。修改建议：去掉虚设的对立否定壳，仅用句中既有事实直接陈述 B。
2. **hollow-transition**: 当段落出现零信息增量的宏大叙事背景套话（如“在当今…浪潮下”、“随着…的不断深入”）或纯形式过渡空句、且去掉后不影响任何事实与因果衔接时触发。修改建议：移除空话铺垫，从具体事实、问题或结论直接切入。
3. **throat-clearing**: 当小标题或上下文已经明确范围，句首仍堆叠“在本节中我们将探讨”、“值得注意的是”等元叙事赘语时触发。修改建议：去掉元叙事起手式，保留核心陈述。
4. **moralizing-closer**: 当段尾或文末出现无实质信息的口号表态或价值拔高收尾（如“展望未来，我们将砥砺前行”）时触发。修改建议：移除口号式收尾，在最后一项具体结论或行动安排处自然收束。
5. **rhetorical-self-qa**: 当使用机械的助手式自问自答过渡（如“为什么这很重要？因为…”）时触发。技术方案中真实待讨论的开放问题不触发。修改建议：将刻意拆开的自问自答合并为自然直述句。
6. **stealth-vapor**: 当整段话通顺无明显套话词，但通篇没有任何具体名词、数值、文件、命令、机制或可验证主语（如空泛讨论“建立清晰的信息同步节奏、保持平稳有序推进”）时触发。具体技术说明、个人叙事场景与克制幽默不触发。修改建议：请作者替换为具体机制、约束或真实事例，或删去该空段。
7. **cooccurrence-padding**: 当单句或单段连续堆叠 3 个及以上空泛管理/渲染动词（如“有效推动”“持续优化”“深度融合”“充分释放”“精细化运营”“全面助力”）而未交代具体技术手段或指标边界时触发。仅出现单个常规动词的技术陈述不触发。修改建议：改写为具体输入、动作与实测结果。
