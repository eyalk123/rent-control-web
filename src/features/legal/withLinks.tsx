import { Fragment } from 'react';

/**
 * Split a translated sentence on `<name>` slots and interleave nodes for them.
 *
 * The two document names inside the acceptance line have to be links, and the word order
 * around them differs between English and Hebrew — so the order has to come from the
 * translation, not from JSX. i18next's own `<Trans>` would do this, but nothing in either
 * client uses it, and one sentence is not a reason to introduce a second interpolation
 * mechanism alongside `t()`.
 *
 * Angle brackets rather than `{{ }}`: i18next resolves its own placeholders during `t()` and
 * replaces any it has no value for with an empty string, so `{{terms}}` would be gone before
 * this function ever saw it. It leaves `<terms>` untouched.
 *
 * Lives here rather than in SignInPage because the consent gate needs the same sentence.
 */
export function withLinks(sentence: string, nodes: Record<string, React.ReactNode>) {
  return sentence.split(/(<\w+>)/g).map((part, i) => {
    const key = part.match(/^<(\w+)>$/)?.[1];
    return <Fragment key={i}>{key ? nodes[key] : part}</Fragment>;
  });
}
