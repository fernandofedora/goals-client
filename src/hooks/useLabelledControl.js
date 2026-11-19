import { Children, cloneElement, isValidElement, useId } from 'react';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import TagPicker from '../components/ui/tag-picker';

// Components that put an `id` on their focusable element.
const CONTROLS = new Set([
  Input,
  Select,
  TagPicker,
  'input',
  'select',
  'textarea',
]);

/**
 * For a form field wrapper: when `children` is a single control, gives it an
 * id (keeping one it already has) and returns that id for the label's
 * `htmlFor`. Anything else passes through with no `htmlFor`.
 */
export default function useLabelledControl(children) {
  const autoId = useId();
  const items = Children.toArray(children);
  const child = items.length === 1 ? items[0] : null;
  if (!isValidElement(child) || !CONTROLS.has(child.type)) {
    return [children, undefined];
  }
  if (child.props.id) return [child, child.props.id];
  return [cloneElement(child, { id: autoId }), autoId];
}
