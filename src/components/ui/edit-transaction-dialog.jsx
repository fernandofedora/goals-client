import * as Dialog from '@radix-ui/react-dialog';
import Input from './input';
import Select from './select';
import DateInput from '../DateInput';
import Button from './button';
import { cn } from '../../lib/utils';

export default function EditTransactionDialog({ open, onOpenChange, initial, expenseCats = [], incomeCats = [], cards = [], onSave, onCancel, error }) {
  const cats = initial.type === 'expense' ? expenseCats : incomeCats;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-[95vw] max-w-lg rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto'
        )}>
          <button 
            onClick={onCancel}
            className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div className="mb-6">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">Edit Transaction</Dialog.Title>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update the transaction details</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 text-rose-600 text-sm border border-rose-100 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Description</label>
              <Input 
                value={initial.description} 
                onChange={(e)=>onSave({ ...initial, description: e.target.value }, true)} 
                placeholder="Description" 
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Amount</label>
                <Input 
                  type="number" 
                  value={initial.amount} 
                  onChange={(e)=>onSave({ ...initial, amount: e.target.value }, true)} 
                  placeholder="0.00" 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Date</label>
                <DateInput 
                  value={initial.date} 
                  onChange={(e)=>onSave({ ...initial, date: e.target.value }, true)} 
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Category</label>
              <Select 
                value={initial.categoryId} 
                onChange={(e)=>onSave({ ...initial, categoryId: e.target.value }, true)}
                className="h-11 w-full"
              >
                <option value="">Select Category</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Type</label>
                <Select value={initial.type} onChange={(e)=>onSave({ ...initial, type: e.target.value }, true)} className="h-11 w-full">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </Select>
              </div>
              {initial.type === 'expense' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Payment Method</label>
                  <Select value={initial.paymentMethod} onChange={(e)=>onSave({ ...initial, paymentMethod: e.target.value }, true)} className="h-11 w-full">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </Select>
                </div>
              )}
            </div>

            {initial.type === 'expense' && initial.paymentMethod === 'card' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Card</label>
                <Select value={initial.cardId || ''} onChange={(e)=>onSave({ ...initial, cardId: e.target.value }, true)} className="h-11 w-full">
                  <option value="">Select Card</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="h-11 px-6 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={()=>onSave(initial, false)}
              className="h-11 px-6 rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-sm font-medium transition-colors"
            >
              Save Changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
