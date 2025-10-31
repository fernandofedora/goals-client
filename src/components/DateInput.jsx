import { useState, useEffect } from 'react';

export default function DateInput({ value, onChange, placeholder = 'Date', className = '', required = false, min, max, name, id }) {
  const [type, setType] = useState(value ? 'date' : 'text');

  useEffect(() => {
    // Si hay valor, usamos 'date' para que se muestre formateado; si no, mostramos placeholder
    setType(value ? 'date' : 'text');
  }, [value]);

  const handleFocus = () => setType('date');
  const handleBlur = (e) => {
    // Si el usuario no seleccionó nada, volver a 'text' para mantener el placeholder visible
    if (!e.target.value) setType('text');
  };

  return (
    <input
      className={className}
      type={type}
      value={value}
      onChange={onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={type === 'text' ? placeholder : undefined}
      inputMode={type === 'text' ? 'numeric' : undefined}
      required={required}
      min={min}
      max={max}
      name={name}
      id={id}
    />
  );
}