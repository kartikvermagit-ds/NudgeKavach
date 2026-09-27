/* Original deterministic rules. Shared by the content script and Node tests. */
(function (root) {
  'use strict';
  const rules = {
    optional(text) {
      return /\b(optional|add[- ]?on|protection plan|extended warranty|device protection|trip protection|travel insurance|shipping insurance|damage protection|gift wrap|newsletter|promotional emails|priority processing|donation)\b/i.test(
        text,
      );
    },
    shaming(text) {
      return /\b(no thanks[,!]?\s+i (?:hate (?:saving|money)|(?:like|love|prefer|enjoy|want to) (?:pay|paying|waste|wasting|miss|missing))|i (?:don't|do not) (?:care about|want to save)|i hate (?:saving|money)|i prefer to pay (?:more|full price)|i(?:'ll| will) pass on (?:savings|discounts?)|no thanks[,!]?\s+i(?:'ll| will) pay full price|no[,!]?\s+i(?:'d| would) rather pay full price)\b/i.test(
        text,
      );
    },
    seconds(text) {
      const match = text.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
      if (match) {
        if (+match[3] > 59 || (match[1] && +match[2] > 59)) return null;
        return +(match[1] || 0) * 3600 + +match[2] * 60 + +match[3];
      }
      const textMatch = text.match(
        /\b(?:(\d{1,2})\s*h(?:ours?)?\s*)?(?:(\d{1,2})\s*m(?:in(?:ute)?s?)?\s*)?(\d{1,2})\s*s(?:ec(?:ond)?s?)?\b/i,
      );
      if (textMatch && (textMatch[1] || textMatch[2])) {
        const s = +textMatch[3];
        const m = +(textMatch[2] || 0);
        const h = +(textMatch[1] || 0);
        if (s > 59 || m > 59) return null;
        return h * 3600 + m * 60 + s;
      }
      return null;
    },
    urgency(text) {
      return /\b(offer|sale|deal|ends?|expires?|hurry|limited|left|remaining|valid until|claim)\b/i.test(
        text,
      );
    },
    fee(text) {
      return (
        /\b(service|handling|processing|platform|booking|convenience|delivery|shipping|packaging|cancellation|regulatory)\s+(?:fee|charge|cost)\b/i.test(
          text,
        ) && /(?:₹|\$|€|£|¥|AED|CAD|AUD|USD|INR|GBP|EUR|Rs\.?)\s*\d/i.test(text)
      );
    },
    prominence(a, b) {
      const areaRatio = a.area / Math.max(1, b.area);
      const fontRatio = a.font / Math.max(1, b.font);
      const opacityFlag = b.opacity !== undefined && b.opacity <= 0.5 && (a.opacity ?? 1) >= 0.85;
      return {
        flag: areaRatio >= 2.5 || fontRatio >= 1.5 || opacityFlag,
        areaRatio,
        fontRatio,
        opacityFlag: !!opacityFlag,
      };
    },
    reset(previous, current) {
      return current > previous + 2;
    },
  };
  root.NudgeRules = rules;
  if (typeof module !== 'undefined') module.exports = rules;
})(globalThis);
