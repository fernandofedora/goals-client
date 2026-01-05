import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';

export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [catForm, setCatForm] = useState({ name:'', type:'expense', color:'#3b82f6' });
  const [cardForm, setCardForm] = useState({ name:'', color:'#0ea5e9', last4:'' });
  const [showCatForm, setShowCatForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({ name:'', type:'expense', color:'#3b82f6' });
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState({ name:'', color:'#0ea5e9', last4:'' });

  const load = async () => {
    const [catRes, cardRes] = await Promise.all([api.get('/categories'), api.get('/cards')]);
    setCategories(catRes.data); setCards(cardRes.data);
  };
  useEffect(()=>{ load(); },[]);

  const addCategory = async (e) => {
    e.preventDefault();
    await api.post('/categories', catForm);
    setCatForm({ name:'', type:'expense', color:'#3b82f6' });
    setShowCatForm(false);
    load();
  };

  const addCard = async (e) => {
    e.preventDefault();
    await api.post('/cards', cardForm);
    setCardForm({ name:'', color:'#0ea5e9', last4:'' });
    setShowCardForm(false);
    load();
  };

  const deleteCategory = async (id) => {
    // Validation: avoid deleting categories in use
    const txRes = await api.get('/transactions');
    const inUse = txRes.data.some(t => t.Category?.id === id);
    if (inUse) {
      alert('No se puede eliminar: la categoría está en uso en transacciones');
      return;
    }
    await api.delete(`/categories/${id}`);
    load();
  };

  const deleteCard = async (id) => {
    await api.delete(`/cards/${id}`);
    load();
  };

  const startEditCat = (cat) => {
    setEditingCatId(cat.id);
    setEditCatForm({ name: cat.name, type: cat.type, color: cat.color });
  };
  const saveEditCat = async (id) => {
    await api.put(`/categories/${id}`, editCatForm);
    setEditingCatId(null);
    load();
  };
  const cancelEditCat = () => setEditingCatId(null);

  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setEditCardForm({ name: card.name, color: card.color, last4: card.last4 });
  };
  const saveEditCard = async (id) => {
    await api.put(`/cards/${id}`, editCardForm);
    setEditingCardId(null);
    load();
  };
  const cancelEditCard = () => setEditingCardId(null);

  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your categories and credit cards</p>
        </div>
      </div>

      {/* Categories card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Categories</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your expense and income categories</p>
          </div>
          <Button variant="secondary" onClick={()=>setShowCatForm(v=>!v)}>+ Add Category</Button>
        </div>

        {showCatForm && (
          <form className="mt-4" onSubmit={addCategory}>
            <div className="flex gap-3 flex-wrap items-center">
              <Input placeholder="Category Name" value={catForm.name} onChange={(e)=>setCatForm(v=>({ ...v, name:e.target.value }))} required />
              <Select value={catForm.type} onChange={(e)=>setCatForm(v=>({ ...v, type:e.target.value }))}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
              <Input className="w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto]" type="color" value={catForm.color} onChange={(e)=>setCatForm(v=>({ ...v, color:e.target.value }))} />
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}

        {/* Expense categories */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Expense Categories</h4>
          <ul className="divide-y divide-gray-100 dark:divide-slate-700 mt-2">
            {expenseCats.map(cat => (
              <li key={cat.id} className="flex items-center justify-between py-3">
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input className="px-2 py-1 w-40" value={editCatForm.name} onChange={(e)=>setEditCatForm(v=>({ ...v, name:e.target.value }))} />
                    <Select className="px-2 py-1" value={editCatForm.type} onChange={(e)=>setEditCatForm(v=>({ ...v, type:e.target.value }))}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </Select>
                    <Input className="w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto]" type="color" value={editCatForm.color} onChange={(e)=>setEditCatForm(v=>({ ...v, color:e.target.value }))} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background:cat.color }}></span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{cat.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {editingCatId === cat.id ? (
                    <>
                      <Button className="px-2 py-1" onClick={()=>saveEditCat(cat.id)}>Save</Button>
                      <Button className="px-2 py-1" variant="outline" onClick={cancelEditCat}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-700" aria-label="Edit" onClick={()=>startEditCat(cat)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182l-10.5 10.5a2.25 2.25 0 01-.845.53l-3.682 1.228a.75.75 0 01-.948-.948l1.228-3.682a2.25 2.25 0 01.53-.845l10.5-10.5z"/></svg>
                      </button>
                      <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-700" aria-label="Delete" onClick={()=>deleteCategory(cat.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-rose-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 7.5h12M9.75 7.5v-1.5A1.5 1.5 0 0111.25 4.5h1.5A1.5 1.5 0 0114.25 6v1.5M8.25 9.75v7.5m7.5-7.5v7.5M5.25 7.5l.75 12a1.5 1.5 0 001.5 1.5h8.5a1.5 1.5 0 001.5-1.5l.75-12"/></svg>
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Income categories */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Income Categories</h4>
          <ul className="divide-y divide-gray-100 dark:divide-slate-700 mt-2">
            {incomeCats.map(cat => (
              <li key={cat.id} className="flex items-center justify-between py-3">
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input className="border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 w-40 dark:bg-slate-700 dark:text-white" value={editCatForm.name} onChange={(e)=>setEditCatForm(v=>({ ...v, name:e.target.value }))} />
                    <select className="border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 dark:bg-slate-700 dark:text-white" value={editCatForm.type} onChange={(e)=>setEditCatForm(v=>({ ...v, type:e.target.value }))}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <input className="border border-gray-300 dark:border-slate-600 rounded-md w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto] dark:bg-slate-700 dark:text-white" type="color" value={editCatForm.color} onChange={(e)=>setEditCatForm(v=>({ ...v, color:e.target.value }))} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background:cat.color }}></span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{cat.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {editingCatId === cat.id ? (
                    <>
                      <button className="px-2 py-1 rounded-md bg-indigo-600 text-white" onClick={()=>saveEditCat(cat.id)}>Save</button>
                      <button className="px-2 py-1 rounded-md border" onClick={cancelEditCat}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-700" aria-label="Edit" onClick={()=>startEditCat(cat)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182l-10.5 10.5a2.25 2.25 0 01-.845.53l-3.682 1.228a.75.75 0 01-.948-.948l1.228-3.682a2.25 2.25 0 01.53-.845l10.5-10.5z"/></svg>
                      </button>
                      <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-700" aria-label="Delete" onClick={()=>deleteCategory(cat.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-rose-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 7.5h12M9.75 7.5v-1.5A1.5 1.5 0 0111.25 4.5h1.5A1.5 1.5 0 0114.25 6v1.5M8.25 9.75v7.5m7.5-7.5v7.5M5.25 7.5l.75 12a1.5 1.5 0 001.5 1.5h8.5a1.5 1.5 0 001.5-1.5l.75-12"/></svg>
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Credit cards */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Credit Cards</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your credit cards for expense tracking</p>
          </div>
          <Button variant="secondary" onClick={()=>setShowCardForm(v=>!v)}>+ Add Card</Button>
        </div>

        {showCardForm && (
          <form className="mt-4" onSubmit={addCard}>
            <div className="flex gap-3 flex-wrap items-center">
              <Input placeholder="Card Name" value={cardForm.name} onChange={(e)=>setCardForm(v=>({ ...v, name:e.target.value }))} required />
              <Input className="w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto]" type="color" value={cardForm.color} onChange={(e)=>setCardForm(v=>({ ...v, color:e.target.value }))} />
              <Input className="w-28" placeholder="Last 4" value={cardForm.last4} onChange={(e)=>setCardForm(v=>({ ...v, last4:e.target.value.replace(/[^0-9]/g,'').slice(0,4) }))} required />
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(card => (
            <div key={card.id} className="relative rounded-xl p-4 text-white overflow-hidden" style={{ background: card.color }}>
              <div className="absolute inset-0 opacity-10" aria-hidden>
                <div className="h-full w-full bg-black"></div>
              </div>
              <div className="relative flex items-center justify-between">
                {editingCardId === card.id ? (
                  <div className="flex items-center gap-2">
                    <Input className="border-white/50 bg-white text-gray-900 dark:bg-slate-800/10 dark:text-white px-2 py-1" value={editCardForm.name} onChange={(e)=>setEditCardForm(v=>({ ...v, name:e.target.value }))} />
                    <Input className="border-white/50 w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto]" type="color" value={editCardForm.color} onChange={(e)=>setEditCardForm(v=>({ ...v, color:e.target.value }))} />
                    <Input className="border-white/50 bg-white text-gray-900 dark:bg-slate-800/10 dark:text-white px-2 py-1 w-24" value={editCardForm.last4} onChange={(e)=>setEditCardForm(v=>({ ...v, last4:e.target.value.replace(/[^0-9]/g,'').slice(0,4) }))} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-6 rounded bg-white text-gray-900 dark:bg-slate-800/20 dark:text-white flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 7.5h19.5m-16.5 9h13.5A2.25 2.25 0 0021 14.25v-6A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25v6A2.25 2.25 0 005.25 16.5z"/></svg>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{card.name}</div>
                      <div className="text-sm tracking-widest">**** **** **** {card.last4}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {editingCardId === card.id ? (
                    <>
                      <Button className="px-2 py-1 bg-white text-gray-900 dark:bg-slate-800/20 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800/30" onClick={()=>saveEditCard(card.id)}>Save</Button>
                      <Button className="px-2 py-1 bg-white text-gray-900 dark:bg-slate-800/10 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800/20" onClick={cancelEditCard}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <button className="p-2 rounded-md bg-white text-gray-900 dark:bg-slate-800/10 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800/20" aria-label="Edit" onClick={()=>startEditCard(card)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182l-10.5 10.5a2.25 2.25 0 01-.845.53l-3.682 1.228a.75.75 0 01-.948-.948l1.228-3.682a2.25 2.25 0 01.53-.845l10.5-10.5z"/></svg>
                      </button>
                      <button className="p-2 rounded-md bg-white text-gray-900 dark:bg-slate-800/10 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800/20" aria-label="Delete" onClick={()=>deleteCard(card.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 7.5h12M9.75 7.5v-1.5A1.5 1.5 0 0111.25 4.5h1.5A1.5 1.5 0 0114.25 6v1.5M8.25 9.75v7.5m7.5-7.5v7.5M5.25 7.5l.75 12a1.5 1.5 0 001.5 1.5h8.5a1.5 1.5 0 001.5-1.5l.75-12"/></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
