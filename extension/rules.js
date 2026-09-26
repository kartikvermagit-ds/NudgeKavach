/* Original deterministic rules. Shared by the content script and Node tests. */
(function (root) {
  'use strict';
  const rules = {
    optional(text) {
      return /\b(optional|add[- ]?on|protection plan|gift wrap|newsletter|promotional emails|shipping insurance)\b/i.test(
        text,
      );
    },
    shaming(text) {
      return /\b(no thanks[,!]?\s+i (?:hate (?:saving|money)|(?:like|love|prefer|enjoy|want to) (?:pay|paying|waste|wasting|miss|missing))|i (?:don't|do not) (?:care about|want to save)|i hate (?:saving|money)|i prefer to pay (?:more|full price))\b/i.test(
        text,
      );
    },
    seconds(text) {
      const match = text.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
      if (!match || +match[3] > 59 || (match[1] && +match[2] > 59)) return null;
      return +(match[1] || 0) * 3600 + +match[2] * 60 + +match[3];
    },
    urgency(text) {
      return /\b(offer|sale|deal|ends?|expires?|hurry|limited|left|remaining)\b/i.test(text);
    },
    fee(text) {
      return (
        /\b(service|handling|processing|platform|booking|convenience|delivery|shipping)\s+(?:fee|charge)\b/i.test(
          text,
        ) && /(?:₹|\$|€|£|INR|USD)\s*\d/i.test(text)
      );
    },
    prominence(a, b) {
      const areaRatio = a.area / Math.max(1, b.area);
      const fontRatio = a.font / Math.max(1, b.font);
      return { flag: areaRatio >= 2.5 || fontRatio >= 1.5, areaRatio, fontRatio };
    },
    reset(previous, current) {
      return current > previous + 2;
    },
  };
  root.NudgeRules = rules;
  if (typeof module !== 'undefined') module.exports = rules;
})(globalThis);
