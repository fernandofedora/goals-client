import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const onLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  return (
    <nav className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <span className="text-xl font-semibold text-gray-800">Expense Control</span>
          <Link className="text-gray-600 hover:text-gray-900" to="/">Dashboard</Link>
          <Link className="text-gray-600 hover:text-gray-900" to="/transactions">Transactions</Link>
          <Link className="text-gray-600 hover:text-gray-900" to="/settings">Settings</Link>
        </div>
        <button className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}