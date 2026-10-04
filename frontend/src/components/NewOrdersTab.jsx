import React, { useState } from 'react';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

const SAMPLE_CHAT = `Customer (10:15 AM): Bhaiya namaste! 2 kg desi ghee aur 1 packet paneer bhej do aaj shaam tak.
Seller (10:16 AM): Namaste ji, ghee ₹1100 aur paneer ₹120. Total ₹1220 hoga.
Customer (10:18 AM): Theek hai, par paneer cancel kar do sirf ghee bhejna. Aur ghee 2 kg nahi 3 kg kar do please!
Customer (10:20 AM): Total ₹1650 maine GPay kar diya hai. Naam: Ramesh Verma, Flat 402 Lotus Greens.`;

export default function NewOrdersTab({
  chatText,
  setChatText,
  extractedOrders,
  setExtractedOrders,
  onExtract,
  isExtracting,
  onConfirmAll,
  isConfirming,
  onSwitchToDashboard
}) {
  const [extractError, setExtractError] = useState('');

  const handleLoadSample = () => {
    setChatText(SAMPLE_CHAT);
    setExtractError('');
  };

  const handleClearChat = () => {
    setChatText('');
    setExtractError('');
  };

  const handleExtractClick = async () => {
    if (!chatText.trim()) {
      setExtractError('Please paste or type a WhatsApp chat message first.');
      return;
    }
    setExtractError('');
    try {
      await onExtract(chatText);
    } catch (err) {
      setExtractError(err.message || 'Failed to extract orders from chat.');
    }
  };

  const handleUpdateOrder = (index, field, value) => {
    setExtractedOrders((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'quantity') {
        item.quantity = value === '' ? null : Number(value);
      } else if (field === 'amount') {
        item.amount = value === '' ? null : Number(value);
      } else {
        item[field] = value;
      }

      // If user edits an uncertain field, we can clear it from uncertain_fields
      if (item.uncertain_fields?.includes(field)) {
        item.uncertain_fields = item.uncertain_fields.filter((f) => f !== field);
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleDeleteOrder = (index) => {
    setExtractedOrders((prev) => prev.filter((_, i) => i !== index));
  };

  const isFieldUncertain = (order, fieldName) => {
    return Array.isArray(order.uncertain_fields) && order.uncertain_fields.includes(fieldName);
  };

  return (
    <div className="tab-content new-orders-tab">
      {/* WhatsApp Input Card */}
      <section className="card chat-input-card">
        <div className="card-header">
          <div className="card-header-titles">
            <h2 className="card-title">
              <span className="title-icon">💬</span>
              WhatsApp Chat Transcript
            </h2>
            <p className="card-subtitle">
              Paste customer chats in English, Hindi, or Hinglish. AI extracts active items, edits, and prices automatically.
            </p>
          </div>
          <div className="card-header-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleLoadSample}
              disabled={isExtracting}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Load sample chat
            </button>
            {chatText && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleClearChat}
                disabled={isExtracting}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="chat-textarea-wrapper">
          <textarea
            className="chat-textarea"
            rows="6"
            placeholder="Example: Bhaiya 2 kg paneer aur 1 packet bread bhej do sham tak. Nahi paneer 3 kg kar do, aur bread cancel. Total ₹600 GPay kar diya. Naam: Rahul"
            value={chatText}
            onChange={(e) => {
              setChatText(e.target.value);
              if (extractError) setExtractError('');
            }}
            disabled={isExtracting}
          />
          {chatText && (
            <div className="textarea-footer">
              <span className="char-count">{chatText.length} characters</span>
            </div>
          )}
        </div>

        {extractError && (
          <div className="alert alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{extractError}</span>
          </div>
        )}

        <div className="chat-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleExtractClick}
            disabled={isExtracting || !chatText.trim()}
          >
            {isExtracting ? (
              <>
                <Spinner size="small" color="#ffffff" />
                <span>Extracting with Gemini...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                <span>Extract Orders</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Extracted Orders Section */}
      {extractedOrders !== null && (
        <section className="card extracted-orders-card">
          <div className="card-header">
            <div className="card-header-titles">
              <div className="extracted-title-row">
                <h2 className="card-title">
                  <span className="title-icon">📋</span>
                  Extracted Orders
                </h2>
                <span className="count-pill">
                  {extractedOrders.length} {extractedOrders.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="card-subtitle">
                Review and edit any field before confirming. Fields highlighted in yellow require your attention.
              </p>
            </div>
            {extractedOrders.length > 0 && (
              <div className="card-header-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onConfirmAll}
                  disabled={isConfirming || extractedOrders.length === 0}
                >
                  {isConfirming ? (
                    <>
                      <Spinner size="small" color="#ffffff" />
                      <span>Saving Orders...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Confirm All ({extractedOrders.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {extractedOrders.length === 0 ? (
            <EmptyState
              icon={
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              }
              title="No active orders found"
              description="Either all items in this chat were cancelled, or no order was requested in the message."
              actionText="Try sample chat"
              onAction={handleLoadSample}
            />
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-table editable-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Confidence</th>
                    <th style={{ minWidth: '150px' }}>Customer Name</th>
                    <th style={{ minWidth: '160px' }}>Item</th>
                    <th style={{ width: '100px' }}>Qty</th>
                    <th style={{ width: '100px' }}>Unit</th>
                    <th style={{ minWidth: '140px' }}>Delivery Date</th>
                    <th style={{ width: '110px' }}>Amount (₹)</th>
                    <th style={{ minWidth: '130px' }}>Payment Status</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedOrders.map((order, idx) => {
                    const isLowConfidence = order.confidence !== undefined && order.confidence < 0.8;

                    return (
                      <React.Fragment key={idx}>
                        <tr className={`order-row ${isLowConfidence ? 'row-needs-review' : ''}`}>
                          {/* Confidence */}
                          <td>
                            <div className="confidence-cell">
                              {isLowConfidence ? (
                                <span className="badge badge-warning" title="Confidence is below 80%. Please check details.">
                                  ⚠️ Needs review
                                </span>
                              ) : (
                                <span className="badge badge-success" title="High confidence extraction">
                                  ✓ {Math.round((order.confidence || 1) * 100)}%
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer Name */}
                          <td>
                            <div className={`input-wrapper ${isFieldUncertain(order, 'customer_name') ? 'field-uncertain' : ''}`}>
                              <input
                                type="text"
                                className="table-input"
                                placeholder="Customer Name"
                                value={order.customer_name || ''}
                                onChange={(e) => handleUpdateOrder(idx, 'customer_name', e.target.value)}
                              />
                              {isFieldUncertain(order, 'customer_name') && (
                                <span className="uncertain-tag" title="Name was not clearly specified in chat">Uncertain</span>
                              )}
                            </div>
                          </td>

                          {/* Item */}
                          <td>
                            <div className={`input-wrapper ${isFieldUncertain(order, 'item') ? 'field-uncertain' : ''}`}>
                              <input
                                type="text"
                                className="table-input font-medium"
                                placeholder="Item name *"
                                value={order.item || ''}
                                onChange={(e) => handleUpdateOrder(idx, 'item', e.target.value)}
                                required
                              />
                              {isFieldUncertain(order, 'item') && (
                                <span className="uncertain-tag" title="Item name was ambiguous">Uncertain</span>
                              )}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td>
                            <div className={`input-wrapper ${isFieldUncertain(order, 'quantity') ? 'field-uncertain' : ''}`}>
                              <input
                                type="number"
                                step="any"
                                className="table-input"
                                placeholder="Qty"
                                value={order.quantity !== null && order.quantity !== undefined ? order.quantity : ''}
                                onChange={(e) => handleUpdateOrder(idx, 'quantity', e.target.value)}
                              />
                              {isFieldUncertain(order, 'quantity') && (
                                <span className="uncertain-tag" title="Quantity was ambiguous">Uncertain</span>
                              )}
                            </div>
                          </td>

                          {/* Unit */}
                          <td>
                            <div className={`input-wrapper ${isFieldUncertain(order, 'unit') ? 'field-uncertain' : ''}`}>
                              <input
                                type="text"
                                className="table-input"
                                placeholder="kg, packet..."
                                value={order.unit || ''}
                                onChange={(e) => handleUpdateOrder(idx, 'unit', e.target.value)}
                              />
                              {isFieldUncertain(order, 'unit') && (
                                <span className="uncertain-tag" title="Unit was unclear">Uncertain</span>
                              )}
                            </div>
                          </td>

                          {/* Delivery Date */}
                          <td>
                            <div className={`input-wrapper ${isFieldUncertain(order, 'delivery_date') ? 'field-uncertain' : ''}`}>
                              <input
                                type="text"
                                className="table-input"
                                placeholder="Delivery date / time"
                                value={order.delivery_date || ''}
                                onChange={(e) => handleUpdateOrder(idx, 'delivery_date', e.target.value)}
                              />
                              {isFieldUncertain(order, 'delivery_date') && (
                                <span className="uncertain-tag" title="Delivery date was not clearly specified">Uncertain</span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td>
                            <div className={`input-wrapper ${isFieldUncertain(order, 'amount') ? 'field-uncertain' : ''}`}>
                              <input
                                type="number"
                                className="table-input"
                                placeholder="₹ Amount"
                                value={order.amount !== null && order.amount !== undefined ? order.amount : ''}
                                onChange={(e) => handleUpdateOrder(idx, 'amount', e.target.value)}
                              />
                              {isFieldUncertain(order, 'amount') && (
                                <span className="uncertain-tag" title="Amount was not clearly mentioned">Uncertain</span>
                              )}
                            </div>
                          </td>

                          {/* Payment Status Dropdown */}
                          <td>
                            <select
                              className={`table-select select-status-${order.payment_status || 'pending'} ${
                                isFieldUncertain(order, 'payment_status') ? 'field-uncertain' : ''
                              }`}
                              value={order.payment_status || 'pending'}
                              onChange={(e) => handleUpdateOrder(idx, 'payment_status', e.target.value)}
                            >
                              <option value="paid">Paid</option>
                              <option value="advance">Advance</option>
                              <option value="pending">Pending</option>
                            </select>
                          </td>

                          {/* Delete action */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-icon btn-danger-icon"
                              title="Delete this order item"
                              onClick={() => handleDeleteOrder(idx)}
                              aria-label="Delete order"
                            >
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>

                        {/* Source message row directly under each order */}
                        {order.source_message && (
                          <tr className={`source-message-row ${isLowConfidence ? 'row-needs-review-sub' : ''}`}>
                            <td colSpan="9">
                              <div className="source-message-container">
                                <span className="source-label">💬 WhatsApp Source:</span>
                                <span className="source-text">"{order.source_message}"</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {extractedOrders.length > 0 && (
            <div className="extracted-footer">
              <div className="footer-legend">
                <span className="legend-item">
                  <span className="legend-swatch yellow"></span>
                  Uncertain field (AI was not 100% sure)
                </span>
                <span className="legend-item">
                  <span className="legend-swatch amber"></span>
                  Needs review (confidence &lt; 80%)
                </span>
              </div>
              <div className="footer-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setExtractedOrders([])}
                  disabled={isConfirming}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={onConfirmAll}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Spinner size="small" color="#ffffff" />
                      <span>Saving Orders...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Confirm and Save Orders</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
