// Graphic organizer library and the criteria matcher.
// Loaded by the page (window.GO) and by the Netlify functions (module.exports).
(function (root) {
  // Section types:
  //   text  - one writing box
  //   list  - one card with `count` lines
  //   boxes - `count` separate cards (chain/web layouts draw each one)
  // countKeys: nouns in the criteria ("three reasons") that set `count`.
  const ORGS = [
    {
      id: 'doublebubble', name: 'Double Bubble Map', layout: 'doublebubble',
      bestFor: 'Comparing and contrasting two things',
      directions: 'Write the two topics in the big bubbles. Bubbles in the middle connect to both topics: that is what they share. Outside bubbles connect to one topic only: that is how they are different.',
      keys: { compare: 3, contrast: 3, similarit: 2, difference: 2, different: 1, alike: 2, 'in common': 2, versus: 2, both: 1, 'double bubble': 5 },
      sections: [
        { id: 'ta', label: 'Topic A', hint: 'First thing you are comparing', type: 'topic' },
        { id: 'tb', label: 'Topic B', hint: 'Second thing you are comparing', type: 'topic' },
        { id: 'a', label: 'Only Topic A', hint: 'Differences: true only for the first one', type: 'list', count: 3, countKeys: ['differences'] },
        { id: 'both', label: 'Both', hint: 'Similarities: true for both', type: 'list', count: 3, countKeys: ['similarities'] },
        { id: 'b', label: 'Only Topic B', hint: 'Differences: true only for the second one', type: 'list', count: 3, countKeys: ['differences'] },
      ],
    },
    {
      id: 'tchart', name: 'T-Chart', layout: 'columns',
      bestFor: 'Two sides: pros and cons, fact and opinion',
      directions: 'List ideas for each side. Try to give both sides the same number of points.',
      keys: { pros: 3, cons: 3, advantage: 3, disadvantage: 3, 'for and against': 3, 'fact and opinion': 3, 'two sides': 2, benefit: 2, drawback: 2, 'both sides': 2 },
      sections: [
        { id: 'left', label: 'Pros', hint: 'Points for', type: 'list', count: 4, countKeys: ['pros', 'advantages', 'benefits'] },
        { id: 'right', label: 'Cons', hint: 'Points against', type: 'list', count: 4, countKeys: ['cons', 'disadvantages', 'drawbacks'] },
      ],
    },
    {
      id: 'sequence', name: 'Sequence Chain', layout: 'chain',
      bestFor: 'Steps, stages, and timelines',
      directions: 'Write each step in order. Each box should lead to the next one.',
      keys: { sequence: 3, step: 3, process: 3, order: 2, chronological: 3, timeline: 3, stage: 3, cycle: 2, procedure: 3, 'how to': 2, first: 1, history: 1 },
      sections: [
        { id: 'steps', label: 'Step', hint: 'What happens here?', type: 'boxes', count: 5, countKeys: ['steps', 'stages', 'events', 'phases'] },
        { id: 'sum', label: 'Wrap-up', hint: 'Sum up the whole process in one or two sentences', type: 'text' },
      ],
    },
    {
      id: 'causeeffect', name: 'Cause and Effect', layout: 'chain',
      bestFor: 'Why something happened and what it led to',
      directions: 'Start with the causes, name the event, then show what happened because of it.',
      keys: { cause: 3, effect: 3, 'led to': 2, result: 2, consequence: 3, impact: 2, 'why did': 2, because: 1, influence: 1 },
      sections: [
        { id: 'causes', label: 'Causes', hint: 'Why did it happen?', type: 'list', count: 3, countKeys: ['causes', 'reasons'] },
        { id: 'event', label: 'Event', hint: 'What happened?', type: 'text' },
        { id: 'effects', label: 'Effects', hint: 'What happened because of it?', type: 'list', count: 3, countKeys: ['effects', 'results', 'consequences'] },
      ],
    },
    {
      id: 'mainidea', name: 'Main Idea and Details', layout: 'web',
      bestFor: 'Summaries and informational reading',
      directions: 'Write the main idea in the center. Each detail box holds one fact or example that supports it.',
      keys: { 'main idea': 4, 'central idea': 4, detail: 2, 'supporting detail': 3, 'key detail': 3, summarize: 2, summary: 2, 'topic sentence': 1 },
      sections: [
        { id: 'main', label: 'Main idea', hint: 'What is it mostly about?', type: 'text' },
        { id: 'details', label: 'Detail', hint: 'A fact or example that supports it', type: 'boxes', count: 3, countKeys: ['details', 'supporting details', 'key details', 'facts', 'examples'] },
      ],
    },
    {
      id: 'cer', name: 'Claim, Evidence, Reasoning', layout: 'chain',
      bestFor: 'Arguments and answering with proof',
      directions: 'State your claim, back it up with evidence, then explain how the evidence proves it.',
      keys: { claim: 4, evidence: 3, reasoning: 3, argue: 3, argument: 3, persuade: 3, persuasive: 3, position: 2, 'support your': 2, cite: 2, 'do you agree': 2, should: 1, opinion: 1 },
      sections: [
        { id: 'claim', label: 'Claim', hint: 'Your answer in one sentence', type: 'text' },
        { id: 'evidence', label: 'Evidence', hint: 'Facts, quotes, or data that prove it', type: 'list', count: 3, countKeys: ['pieces of evidence', 'evidence', 'quotes', 'facts', 'reasons', 'examples'] },
        { id: 'reason', label: 'Reasoning', hint: 'How does the evidence prove your claim?', type: 'text' },
      ],
    },
    {
      id: 'story', name: 'Story Map', layout: 'columns',
      bestFor: 'Short stories, novels, and narrative writing',
      directions: 'Fill in each part of the story. Keep the key events in the order they happen.',
      keys: { story: 2, narrative: 3, character: 2, setting: 3, plot: 3, conflict: 3, climax: 3, resolution: 3, theme: 2, novel: 2, 'story map': 4 },
      sections: [
        { id: 'chars', label: 'Characters', hint: 'Who is in the story?', type: 'list', count: 3, countKeys: ['characters'] },
        { id: 'setting', label: 'Setting', hint: 'Where and when?', type: 'text' },
        { id: 'conflict', label: 'Problem', hint: 'What goes wrong or needs solving?', type: 'text' },
        { id: 'events', label: 'Key events', hint: 'In order', type: 'list', count: 3, countKeys: ['events', 'key events'] },
        { id: 'climax', label: 'Turning point', hint: 'The most exciting moment', type: 'text' },
        { id: 'resolution', label: 'Resolution', hint: 'How does it end?', type: 'text' },
        { id: 'theme', label: 'Theme', hint: 'What lesson does the story teach?', type: 'text' },
      ],
    },
    {
      id: 'frayer', name: 'Frayer Model', layout: 'quad',
      bestFor: 'Vocabulary words and key terms',
      directions: 'Put the word in the center, then fill in all four corners.',
      keys: { vocabulary: 4, define: 3, definition: 3, term: 2, 'non-example': 4, nonexample: 4, characteristic: 2, frayer: 5 },
      sections: [
        { id: 'word', label: 'Word', hint: 'The word or idea', type: 'text' },
        { id: 'def', label: 'Definition', hint: 'In your own words', type: 'text' },
        { id: 'chars', label: 'Characteristics', hint: 'What is it like?', type: 'list', count: 3, countKeys: ['characteristics'] },
        { id: 'ex', label: 'Examples', hint: 'Things that are it', type: 'list', count: 3, countKeys: ['examples'] },
        { id: 'non', label: 'Non-examples', hint: 'Things that are not it', type: 'list', count: 3, countKeys: ['non-examples', 'nonexamples'] },
      ],
    },
    {
      id: 'kwl', name: 'KWL Chart', layout: 'columns',
      bestFor: 'Research and reading a new topic',
      directions: 'Fill in K and W before you start. Come back and fill in L when you finish.',
      keys: { kwl: 5, 'what you know': 3, wonder: 3, 'before reading': 2, research: 2, investigate: 2, inquiry: 3, learned: 2 },
      sections: [
        { id: 'k', label: 'What I Know', hint: 'Before you start', type: 'list', count: 3 },
        { id: 'w', label: 'What I Wonder', hint: 'Questions you have', type: 'list', count: 3, countKeys: ['questions'] },
        { id: 'l', label: 'What I Learned', hint: 'After you finish', type: 'list', count: 3 },
      ],
    },
    {
      id: 'fivew', name: '5 Ws and H', layout: 'columns',
      bestFor: 'News, current events, and historical events',
      directions: 'Answer each question with facts from your source.',
      keys: { 'who, what': 4, '5 w': 4, 'five w': 4, news: 3, article: 2, 'current event': 4, journalist: 3, biography: 2, report: 1, event: 1 },
      sections: [
        { id: 'who', label: 'Who?', hint: 'People involved', type: 'text' },
        { id: 'what', label: 'What?', hint: 'What happened', type: 'text' },
        { id: 'when', label: 'When?', hint: 'Date or time', type: 'text' },
        { id: 'where', label: 'Where?', hint: 'Place', type: 'text' },
        { id: 'why', label: 'Why?', hint: 'Reason it happened', type: 'text' },
        { id: 'how', label: 'How?', hint: 'How it happened', type: 'text' },
      ],
    },
    {
      id: 'essay', name: 'Essay Planner', layout: 'stack',
      bestFor: 'Planning paragraphs and essays',
      directions: 'Plan your introduction, each body paragraph, and your conclusion before you write.',
      keys: { essay: 4, paragraph: 2, introduction: 3, thesis: 3, 'body paragraph': 4, conclusion: 2, 'five-paragraph': 4, informative: 2, explanatory: 2 },
      sections: [
        { id: 'intro', label: 'Introduction', hint: 'Hook and thesis: what will you explain or prove?', type: 'text' },
        { id: 'body', label: 'Body paragraph', hint: 'Topic sentence, details, explanation', type: 'boxes', count: 3, countKeys: ['body paragraphs', 'paragraphs', 'reasons'] },
        { id: 'concl', label: 'Conclusion', hint: 'Restate your thesis and end with a final thought', type: 'text' },
      ],
    },
    {
      id: 'problem', name: 'Problem and Solution', layout: 'chain',
      bestFor: 'Design challenges and proposing fixes',
      directions: 'Describe the problem, brainstorm solutions, then pick the best one.',
      keys: { problem: 3, solution: 3, solve: 3, propose: 2, design: 2, fix: 1, issue: 1, plan: 1 },
      sections: [
        { id: 'problem', label: 'Problem', hint: 'What needs to be solved?', type: 'text' },
        { id: 'options', label: 'Possible solutions', hint: 'Brainstorm', type: 'list', count: 3, countKeys: ['solutions', 'ideas'] },
        { id: 'best', label: 'Best solution', hint: 'Pick one and explain why', type: 'text' },
        { id: 'result', label: 'Expected result', hint: 'What will happen if it works?', type: 'text' },
      ],
    },
    {
      id: 'web', name: 'Brainstorm Web', layout: 'web',
      bestFor: 'Brainstorming and describing a topic',
      directions: 'Write your topic in the center and one idea in each bubble.',
      keys: { brainstorm: 4, 'mind map': 4, idea: 2, explore: 2, describe: 2, 'think about': 1, topic: 1 },
      sections: [
        { id: 'center', label: 'Topic', hint: 'Your topic', type: 'text' },
        { id: 'ideas', label: 'Idea', hint: 'One idea', type: 'boxes', count: 6, countKeys: ['ideas'] },
      ],
    },
  ];

  const NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Score every organizer against the criteria text. Returns best first.
  function match(text) {
    const t = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    return ORGS.map(o => {
      let score = 0; const hits = [];
      for (const [k, w] of Object.entries(o.keys)) {
        const re = new RegExp('\\b' + escapeRe(k) + '(s|es|ed|ing|ies|y)?\\b', 'g');
        const n = (t.match(re) || []).length;
        if (n) { score += w * Math.min(n, 2); hits.push(k); }
      }
      return { org: o, score, hits };
    }).sort((a, b) => b.score - a.score);
  }

  // "at least three reasons" -> { reasons: 3 }
  function detectCounts(text) {
    const out = {};
    const re = /\b(\d|one|two|three|four|five|six|seven|eight)\s+(?:or more\s+|different\s+|strong\s+|important\s+)?((?:pieces of )?(?:supporting |key |body )?[a-z-]+)/gi;
    let m;
    while ((m = re.exec(text))) {
      const n = NUMS[m[1].toLowerCase()] || parseInt(m[1], 10);
      if (n >= 1 && n <= 8) out[m[2].toLowerCase()] = n;
    }
    return out;
  }

  // "Compare and contrast Ponyboy and Johnny in ..." -> ['Ponyboy', 'Johnny']
  function detectPair(text) {
    const m = text.match(/compar\w*(?:\s+and\s+contrast\w*)?\s+(?:the\s+)?(.{2,30}?)\s+(?:and|with|to)\s+(?:the\s+)?(.{2,30}?)(?=[.,;:!?]|\s+in\s|\s+from\s|\s+using\s|$)/im);
    return m ? [m[1].trim(), m[2].trim()] : null;
  }

  // Criteria text -> short checklist lines for students.
  function checklist(text) {
    let lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (lines.length <= 1) lines = text.split(/(?<=[.!?])\s+/);
    return lines.map(s => s.replace(/^[-*•\d.)\s]+/, '').trim()).filter(s => s.length > 3).slice(0, 8);
  }

  // Build a self-contained assignment config from an organizer + teacher text.
  function buildConfig(org, title, criteria) {
    const counts = detectCounts(criteria);
    const sections = org.sections.map(s => {
      const sec = { id: s.id, label: s.label, hint: s.hint, type: s.type };
      if (s.count) {
        sec.count = s.count;
        for (const k of s.countKeys || []) if (counts[k]) { sec.count = counts[k]; break; }
      }
      return sec;
    });
    if (org.id === 'doublebubble') {
      const pair = detectPair(criteria);
      if (pair) {
        sections[0].label = pair[0]; sections[1].label = pair[1];
        sections[2].label = 'Only ' + pair[0]; sections[4].label = 'Only ' + pair[1];
      }
    }
    return {
      v: 1, org: org.id, name: org.name, layout: org.layout,
      title: title || 'Graphic organizer', directions: org.directions,
      sections, checklist: checklist(criteria), canvas: null,
    };
  }

  // Config sections -> the cards actually drawn. A `boxes` section becomes
  // one card per box. Each card knows where its answer lives in `answers.s`.
  function cards(cfg) {
    const out = [];
    for (const s of cfg.sections) {
      if (s.type === 'boxes') {
        for (let i = 0; i < s.count; i++) {
          out.push({ key: s.id + '.' + i, sid: s.id, idx: i, kind: 'text', label: s.label + ' ' + (i + 1), hint: s.hint, color: out.length % 5 });
        }
      } else if (s.type === 'topic') {
        out.push({ key: s.id, sid: s.id, idx: null, kind: 'topic', label: s.label, hint: s.hint, color: 0 });
      } else {
        out.push({ key: s.id, sid: s.id, idx: null, kind: s.type, count: s.count || 0, label: s.label, hint: s.hint, color: out.length % 5 });
      }
    }
    return out;
  }

  // A topic bubble the teacher left as "Topic A" is the student's to fill in.
  function topicIsOpen(card) { return /^Topic [AB]$/.test(card.label); }
  function topicName(card, answers) {
    const v = (((answers || {}).s || {})[card.sid] || '').trim();
    return topicIsOpen(card) ? v : card.label;
  }

  // Read a card's answer: a string for text, an array of strings for list.
  function valueOf(card, answers) {
    const v = ((answers || {}).s || {})[card.sid];
    if (card.idx !== null) return (Array.isArray(v) ? v[card.idx] : '') || '';
    if (card.kind === 'list') {
      const arr = Array.isArray(v) ? v : [];
      return Array.from({ length: card.count }, (_, i) => arr[i] || '');
    }
    return typeof v === 'string' ? v : '';
  }

  const api = { ORGS, match, detectCounts, detectPair, checklist, buildConfig, cards, valueOf, topicIsOpen, topicName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GO = api;
})(typeof window !== 'undefined' ? window : globalThis);
