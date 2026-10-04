import React, { useState } from "react";
import Spinner from "./Spinner";
import EmptyState from "./EmptyState";

export default function CatalogTab({ catalog, isLoading, onAdd, onDelete, isAdding }) {
  const [name, setName] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) return setFormError("Item name is required.");
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return setFormError("Price must be a valid non-negative number.");
    const aliases = aliasInput.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      await onAdd({ name: name.trim(), aliases, price_per_unit: priceNum, unit: unit.trim() || null });
      setName(""); setAliasInput(""); setPrice(""); setUnit("");
    } catch (err) {
      setFormError(err.message || "Failed to add item.");
    }
  };

  return (
    <div className="catalog-tab">
      <div className="card catalog-form-card">
        <div className="card-header">
          <span className="card-icon">📋</span>
          <div>
            <h2 className="card-title">My Items / Price List</h2>
            <p className="card-subtitle">Save item names, alternate names and price per unit</p>
          </div>
        </div>
        <form className="catalog-form" onSubmit={handleSubmit} noValidate>
          <div className="catalog-form-row">
            <div className="form-group">
              <label htmlFor="catalog-name" className="form-label">Item Name *</label>
              <input id="catalog-name" type="text" className="form-input" placeholder="e.g. Tamatar" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="catalog-price" className="form-label">Price / Unit (Rs) *</label>
              <input id="catalog-price" type="number" min="0" step="0.01" className="form-input" placeholder="e.g. 40" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="catalog-unit" className="form-label">Unit</label>
              <input id="catalog-unit" type="text" className="form-input" placeholder="e.g. kg, dozen, piece" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="catalog-aliases" className="form-label">Alternate Names <span className="form-hint">(comma-separated, e.g. tomato, tomate)</span></label>
            <input id="catalog-aliases" type="text" className="form-input" placeholder="e.g. tomato, tomate, tamatar" value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button type="submit" className="btn btn-primary" disabled={isAdding}>
            {isAdding ? "Adding..." : "+ Add Item"}
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="loading-center"><Spinner /><p>Loading catalog...</p></div>
      ) : catalog.length === 0 ? (
        <EmptyState icon="📦" title="No items yet" message="Add your first item above so OrderSaathi can verify prices automatically." />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Alternate Names</th>
                  <th>Unit</th>
                  <th>Price / Unit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item._id}>
                    <td><strong>{item.name}</strong></td>
                    <td>
                      {item.aliases && item.aliases.length > 0
                        ? item.aliases.map((a) => <span key={a} className="alias-chip">{a}</span>)
                        : <span className="text-muted">-</span>}
                    </td>
                    <td>{item.unit || <span className="text-muted">-</span>}</td>
                    <td className="amount-cell">Rs. {item.price_per_unit}</td>
                    <td>
                      <button className="btn btn-danger-sm" onClick={() => onDelete(item._id)} title="Delete item">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
