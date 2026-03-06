import { useState, useEffect } from 'react';
import api from '../api';
import Button from '../components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import Input from '../components/ui/input';
import Label from '../components/ui/label';
import Select from '../components/ui/select';

export default function ScheduledPayments() {
  const [scheduledPayments, setScheduledPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [formState, setFormState] = useState({
    name: '',
    type: 'expense',
    amount: '',
    period: 'monthly',
    account: '',
    category: '',
    description: '',
    startDate: '',
    endDate: '',
    specificDay: '',
  });

  useEffect(() => {
    fetchScheduledPayments();
    fetchCategories();
    fetchCards();
  }, []);

  const fetchScheduledPayments = async () => {
    try {
      const res = await api.get('/scheduled-payments');
      setScheduledPayments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCards = async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        await api.put(`/scheduled-payments/${editingPayment._id}`, formState);
      } else {
        await api.post('/scheduled-payments', formState);
      }
      fetchScheduledPayments();
      setIsFormOpen(false);
      setEditingPayment(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openForm = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormState({
        name: payment.name,
        type: payment.type,
        amount: payment.amount,
        period: payment.period,
        account: payment.account._id,
        category: payment.category._id,
        description: payment.description || '',
        startDate: new Date(payment.startDate).toISOString().split('T')[0],
        endDate: payment.endDate ? new Date(payment.endDate).toISOString().split('T')[0] : '',
        specificDay: payment.specificDay || '',
      });
    } else {
      setEditingPayment(null);
      setFormState({
        name: '',
        type: 'expense',
        amount: '',
        period: 'monthly',
        account: '',
        category: '',
        description: '',
        startDate: '',
        endDate: '',
        specificDay: '',
      });
    }
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/scheduled-payments/${id}`);
      fetchScheduledPayments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (payment) => {
    try {
      const newStatus = payment.status === 'active' ? 'paused' : 'active';
      await api.put(`/scheduled-payments/${payment._id}`, { status: newStatus });
      fetchScheduledPayments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Scheduled Payments</h1>
        <Dialog.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
          <Dialog.Trigger asChild>
            <Button onClick={() => openForm()}>Create Payment</Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingPayment ? 'Edit' : 'Create'} Scheduled Payment</Dialog.Title>
            </Dialog.Header>
            <form onSubmit={handleSubmit}>
              {/* Form fields */}
              <div className="grid gap-4 py-4">
                {/* Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" value={formState.name} onChange={handleInputChange} className="col-span-3" required />
                </div>
                {/* Type */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <select id="type" name="type" value={formState.type} onChange={handleInputChange} className="col-span-3">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                {/* Amount */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input id="amount" name="amount" type="number" value={formState.amount} onChange={handleInputChange} className="col-span-3" required />
                </div>
                {/* Period */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="period" className="text-right">Period</Label>
                  <select id="period" name="period" value={formState.period} onChange={handleInputChange} className="col-span-3">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {/* Account */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="account" className="text-right">Account</Label>
                  <select id="account" name="account" value={formState.account} onChange={handleInputChange} className="col-span-3" required>
                    <option value="">Select Account</option>
                    {cards.map(card => <option key={card._id} value={card._id}>{card.name}</option>)}
                  </select>
                </div>
                {/* Category */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <select id="category" name="category" value={formState.category} onChange={handleInputChange} className="col-span-3" required>
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                </div>
                {/* Description */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Input id="description" name="description" value={formState.description} onChange={handleInputChange} className="col-span-3" />
                </div>
                {/* Start Date */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startDate" className="text-right">Start Date</Label>
                  <Input id="startDate" name="startDate" type="date" value={formState.startDate} onChange={handleInputChange} className="col-span-3" required />
                </div>
                {/* End Date */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endDate" className="text-right">End Date</Label>
                  <Input id="endDate" name="endDate" type="date" value={formState.endDate} onChange={handleInputChange} className="col-span-3" />
                </div>
                {/* Specific Day */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specificDay" className="text-right">Specific Day</Label>
                  <Input id="specificDay" name="specificDay" type="number" value={formState.specificDay} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 15 for monthly"/>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">{editingPayment ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scheduledPayments.map(payment => (
          <div key={payment._id} className="p-4 border rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <h2 className="font-bold text-lg">{payment.name}</h2>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                {payment.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{payment.type === 'income' ? 'Income' : 'Expense'}</p>
            <p className="text-xl font-bold">${payment.amount.toFixed(2)}</p>
            <div className="text-sm mt-2">
              <p><strong>Period:</strong> {payment.period}</p>
              <p><strong>Category:</strong> {payment.category?.name}</p>
              <p><strong>Account:</strong> {payment.account?.name}</p>
              <p><strong>Next Due:</strong> {new Date(payment.nextDueDate).toLocaleDateString()}</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => openForm(payment)}>Edit</Button>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange(payment)}>
                {payment.status === 'active' ? 'Pause' : 'Resume'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(payment._id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
