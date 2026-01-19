import * as Dialog from '@radix-ui/react-dialog';
import Input from './input';
import Select from './select';
import DateInput from '../DateInput';
import Button from './button';
import { cn } from '../../lib/utils';

export default function EditTransactionDialog({ open, onOpenChange, initial, expenseCats = [], incomeCats = [], onSave, onCancel, error }) {
  const cats = initial.type === 'expense' ? expenseCats : incomeCats;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className={cn('fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50', 'w-[95vw] max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg')}>
          <Dialog.Title className="text-lg font-semibold mb-3">Edit Transaction</Dialog.Title>
          {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <DateInput value={initial.date} onChange={(v)=>onSave({ ...initial, date: v }, true)} />
            <Select value={initial.type} onChange={(e)=>onSave({ ...initial, type: e.target.value }, true)}>
              <option value="expense">expense</option>
              <option value="income">income</option>
            </Select>
            <Input value={initial.description} onChange={(e)=>onSave({ ...initial, description: e.target.value }, true)} placeholder="Description" />
            <Select value={initial.categoryId} onChange={(e)=>onSave({ ...initial, categoryId: e.target.value }, true)}>
              <option value="">No Category</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input type="number" value={initial.amount} onChange={(e)=>onSave({ ...initial, amount: e.target.value }, true)} placeholder="Amount" />
            <Select value={initial.paymentMethod} onChange={(e)=>onSave({ ...initial, paymentMethod: e.target.value }, true)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={()=>onSave(initial, false)}>Save</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
