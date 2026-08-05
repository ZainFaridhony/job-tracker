// Values from the reference design system that this project deliberately
// superseded. See PRD §9: the mark is #1E1E1E and pure neutral, while these run
// cool, so mixing them in is a visible defect rather than a style preference.
const SUPERSEDED = new Set(['#000000', '#1a1c1c', '#444748', '#c4c7c7', '#747878'])

const HEX = /#[0-9a-fA-F]{3,8}\b/g

function expand(hex) {
  return hex.length === 4
    ? '#' +
        hex
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
    : hex
}

/** @type {import('eslint').Rule.RuleModule} */
export const noRawColor = {
  meta: {
    type: 'problem',
    docs: { description: 'Use design tokens instead of colour literals' },
    schema: [],
    messages: {
      raw: 'Raw colour "{{value}}" — use a token utility such as bg-ink, text-text-muted or border-outline. Tokens are defined in @job-tracker/config.',
      superseded:
        'Colour "{{value}}" belongs to the superseded reference palette (PRD §9). Use a token utility instead.',
    },
  },
  create(context) {
    function check(node, value) {
      if (typeof value !== 'string') return
      for (const match of value.matchAll(HEX)) {
        const full = expand(match[0].toLowerCase())
        context.report({
          node,
          messageId: SUPERSEDED.has(full) ? 'superseded' : 'raw',
          data: { value: match[0] },
        })
      }
    }

    return {
      Literal(node) {
        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value.raw)
      },
    }
  },
}
