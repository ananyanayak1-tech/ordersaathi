import React, { useState, useMemo } from "react";
import Spinner from "./Spinner";
import EmptyState from "./EmptyState";

export default function DashboardTab({
  orders = [],
  isLoading,
  onRefresh,
  onMarkPaid,
  onGetReminder,
  updatingOrderId,
  reminderData,
  onCloseReminder,
  onGoToNewOrders
}) {
  const [copied, setCopied] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReminderOrderId, setActiveReminderOrderId] = useState(null);
  const [activeView, setActiveView] = useState("orders"); // "orders" | "prep" | "balances"
  const [sellerUpiId, setSellerUpiId] = useState("shopkeeper@upi");
  const [includeUpiLink, setIncludeUpiLink] = useState(true);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayDateStr = now.toISOString().slice(0, 10);

  const totalOrders = orders.length;
  const todayOrders = orders.filter((o) => {
    if (!o.created_at) return false;
    return new Date(o.created_at).getTime() >= todayStart;
  }).length;
  const pendingPaymentsCount = orders.filter(
    (o) => o.payment_status === "pending" || o.payment_status === "advance"
  ).length;
  const totalAmountDue = orders
    .filter((o) => (o.payment_status === "pending" || o.payment_status === "advance") && o.amount)
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);

  // Today prep list — aggregate qty per item for orders created today
  const prepList = useMemo(() => {
    const todayConfirmed = orders.filter((o) => {
      if (!o.created_at) return false;
      return new Date(o.created_at).getTime() >= todayStart;
    });
    const map = {};
    todayConfirmed.forEach((o) => {
      const key = (o.item || "Unknown").toLowerCase();
      if (!map[key]) map[key] = { item: o.item, unit: o.unit, qty: 0 };
      map[key].qty += Number(o.quantity || 0);
    });
    return Object.values(map).sort((a, b) => a.item.localeCompare(b.item));
  }, [orders, todayStart]);

  // Per-customer outstanding balance
  const customerBalances = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.customer_name || "Unknown";
      if (!map[name]) map[name] = { customer: name, pending: 0, total: 0 };
      if (o.amount) {
        map[name].total += Number(o.amount);
        if (o.payment_status === "pending" || o.payment_status === "advance") {
          map[name].pending += Number(o.amount);
        }
      }
    });
    return Object.values(map).sort((a, b) => b.pending - a.pending);
  }, [orders]);

  // Filtering
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      filterStatus === "all" || (order.payment_status || "pending").toLowerCase() === filterStatus;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
      (order.item && order.item.toLowerCase().includes(query)) ||
      (order.delivery_date && order.delivery_date.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const handleCopyReminder = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReminderClick = async (orderId) => {
    setActiveReminderOrderId(orderId);
    await onGetReminder(orderId);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return dateStr; }
  };

  // Build WhatsApp send link
  const buildWALink = (order, reminderText) => {
    const phone = order.phone ? order.phone.replace(/\D/g, "") : "";
    let fullText = reminderText || "";
    if (includeUpiLink && order.amount && sellerUpiId.trim()) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(sellerUpiId.trim())}&pn=OrderSaathi&am=${order.amount}&cu=INR`;
      fullText += `\n\nPay via UPI: ${upiUrl}`;
    }
    const text = encodeURIComponent(fullText);
    return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  return (
    <div className="tab-content dashboard-tab">
      {/* Summary Metric Cards */}
      <section className="metric-cards-grid">
        <div className="metric-card">
          <div className="metric-icon-box bg-green-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Orders</span>
            <span className="metric-value">{totalOrders}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box bg-blue-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Today Orders</span>
            <span className="metric-value">{todayOrders}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box bg-amber-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending Payments</span>
            <span className="metric-value text-amber">{pendingPaymentsCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box bg-rose-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Amount Due</span>
            <span className="metric-value text-rose">Rs.{totalAmountDue.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </section>

      {/* Reminder Popup */}
      {reminderData && (() => {
        const currentOrder = orders.find((o) => o._id === reminderData.orderId) || {};
        const upiUrl = currentOrder.amount && sellerUpiId.trim()
          ? `upi://pay?pa=${encodeURIComponent(sellerUpiId.trim())}&pn=OrderSaathi&am=${currentOrder.amount}&cu=INR`
          : null;
        const qrImgUrl = upiUrl
          ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiUrl)}`
          : null;

        return (
          <section className="card reminder-box-card">
            <div className="reminder-header">
              <div className="reminder-title-area">
                <div className="reminder-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  AI WhatsApp Reminder (Hinglish)
                </div>
                <span className="reminder-order-name">For: <strong>{reminderData.customer_name || "Customer"}</strong> ({reminderData.item})</span>
              </div>
              <button type="button" className="btn-icon btn-ghost" onClick={onCloseReminder} title="Close">x</button>
            </div>

            <div className="whatsapp-bubble">
              <div className="bubble-text">{reminderData.reminder || reminderData.message}</div>
              <div className="bubble-time">Just now</div>
            </div>

            {/* UPI Payment QR & Link Generator */}
            {currentOrder.amount ? (
              <div className="upi-qr-card">
                <div className="upi-qr-header">
                  <span className="upi-title">📱 Dynamic UPI Payment QR Code</span>
                  <div className="upi-input-inline">
                    <label style={{ fontSize: '0.8rem', color: '#475569' }}>Seller UPI ID:</label>
                    <input
                      type="text"
                      className="table-input"
                      style={{ width: '160px', padding: '2px 8px', fontSize: '0.85rem' }}
                      value={sellerUpiId}
                      onChange={(e) => setSellerUpiId(e.target.value)}
                      placeholder="e.g. 9876543210@upi"
                    />
                  </div>
                </div>
                <div className="upi-qr-content">
                  {qrImgUrl && (
                    <div className="qr-image-wrapper">
                      <img src={qrImgUrl} alt="UPI Payment QR Code" className="qr-image" width="130" height="130" />
                      <span className="qr-caption">Scan to pay ₹{currentOrder.amount}</span>
                    </div>
                  )}
                  <div className="upi-details-col">
                    <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#334155' }}>
                      <strong>Amount Due:</strong> ₹{currentOrder.amount}
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#64748b', wordBreak: 'break-all' }}>
                      UPI URL: <code>{upiUrl}</code>
                    </p>
                    <label className="checkbox-label" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={includeUpiLink}
                        onChange={(e) => setIncludeUpiLink(e.target.checked)}
                      />
                      <span>Attach UPI payment link to WhatsApp message</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="reminder-actions">
              <button
                type="button"
                className={`btn ${copied ? "btn-success" : "btn-primary"}`}
                onClick={() => handleCopyReminder((reminderData.reminder || reminderData.message) + (includeUpiLink && upiUrl ? `\n\nPay via UPI: ${upiUrl}` : ''))}
              >
                {copied ? "Copied!" : "Copy Message"}
              </button>

              <a
                href={buildWALink(
                  currentOrder,
                  reminderData.reminder || reminderData.message
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
              >
                Send on WhatsApp
              </a>

              <button type="button" className="btn btn-ghost" onClick={onCloseReminder}>Dismiss</button>
            </div>
          </section>
        );
      })()}

      {/* View toggle */}
      <div className="view-toggle">
        <button className={`toggle-btn ${activeView === "orders" ? "active" : ""}`} onClick={() => setActiveView("orders")}>
          Orders
        </button>
        <button className={`toggle-btn ${activeView === "prep" ? "active" : ""}`} onClick={() => setActiveView("prep")}>
          Today Prep List
        </button>
        <button className={`toggle-btn ${activeView === "balances" ? "active" : ""}`} onClick={() => setActiveView("balances")}>
          Customer Balances
        </button>
      </div>

      {/* TODAY PREP LIST */}
      {activeView === "prep" && (
        <section className="card">
          <div className="card-header">
            <span className="card-icon">🧑‍🍳</span>
            <div>
              <h2 className="card-title">Today Prep List</h2>
              <p className="card-subtitle">Total quantities to prepare for orders received today</p>
            </div>
          </div>
          {prepList.length === 0 ? (
            <EmptyState icon="🌅" title="No orders today" message="No confirmed orders were received today yet." />
          ) : (
            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Total Quantity</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {prepList.map((row, i) => (
                    <tr key={i}>
                      <td><strong>{row.item}</strong></td>
                      <td className="amount-cell">{row.qty}</td>
                      <td>{row.unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CUSTOMER BALANCES */}
      {activeView === "balances" && (
        <section className="card">
          <div className="card-header">
            <span className="card-icon">💰</span>
            <div>
              <h2 className="card-title">Customer Outstanding Balances</h2>
              <p className="card-subtitle">Pending + advance amount per customer</p>
            </div>
          </div>
          {customerBalances.length === 0 ? (
            <EmptyState icon="🧾" title="No balance data" message="Confirm some orders first." />
          ) : (
            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Total Ordered</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerBalances.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <div className="customer-name-wrapper">
                          <span className="customer-avatar">{row.customer.charAt(0).toUpperCase()}</span>
                          <span className="customer-name">{row.customer}</span>
                        </div>
                      </td>
                      <td className="amount-cell">Rs.{row.total.toLocaleString("en-IN")}</td>
                      <td className={`amount-cell ${row.pending > 0 ? "text-rose" : "text-green"}`}>
                        Rs.{row.pending.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className={`payment-pill ${row.pending > 0 ? "pill-pending" : "pill-paid"}`}>
                          {row.pending > 0 ? "Outstanding" : "Cleared"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ORDERS LIST */}
      {activeView === "orders" && (
        <section className="card orders-list-card">
          <div className="card-header dashboard-header">
            <div className="card-header-titles">
              <h2 className="card-title"><span className="title-icon">📦</span>Confirmed Orders</h2>
              <p className="card-subtitle">Manage all confirmed orders, track payments, and send Hinglish reminders.</p>
            </div>
            <div className="dashboard-controls">
              <div className="search-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search customer, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" className="clear-search" onClick={() => setSearchQuery("")}>x</button>
                )}
              </div>
              <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Payments</option>
                <option value="pending">Pending</option>
                <option value="advance">Advance</option>
                <option value="paid">Paid</option>
              </select>
              <button type="button" className="btn btn-outline" onClick={onRefresh} disabled={isLoading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isLoading ? "spin-icon" : ""}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {isLoading && orders.length === 0 ? (
            <div className="table-loading-container">
              <Spinner size="large" color="#16a34a" text="Loading orders..." />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>}
              title="No orders found yet"
              description="Extract orders from a WhatsApp chat to get started."
              actionText="Extract New Orders"
              onAction={onGoToNewOrders}
            />
          ) : filteredOrders.length === 0 ? (
            <div className="no-filter-results">
              <p>No orders match your filters.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus("all"); setSearchQuery(""); }}>Reset filters</button>
            </div>
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-table dashboard-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "130px" }}>Date</th>
                    <th style={{ minWidth: "150px" }}>Customer</th>
                    <th style={{ minWidth: "160px" }}>Item &amp; Qty</th>
                    <th style={{ minWidth: "130px" }}>Delivery</th>
                    <th style={{ width: "100px" }}>Amount</th>
                    <th style={{ width: "110px" }}>Payment</th>
                    <th style={{ minWidth: "220px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const status = (order.payment_status || "pending").toLowerCase();
                    const isUpdating = updatingOrderId === order._id;
                    const isGettingReminder = activeReminderOrderId === order._id && !reminderData;

                    return (
                      <tr key={order._id} className="dashboard-order-row">
                        <td className="date-cell"><span className="date-text">{formatDateTime(order.created_at)}</span></td>
                        <td className="customer-cell">
                          <div className="customer-name-wrapper">
                            <span className="customer-avatar">{(order.customer_name || "C").charAt(0).toUpperCase()}</span>
                            <div>
                              <span className="customer-name">{order.customer_name || "Anonymous"}</span>
                              {order.phone && <span className="customer-phone">{order.phone}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="item-cell">
                          <div className="item-details">
                            <strong className="item-name">{order.item}</strong>
                            <span className="item-qty">{order.quantity} {order.unit || ""}</span>
                            {order.price_warning && (
                              <span className="warn-badge" title="Stated amount differs from catalog price">Price mismatch</span>
                            )}
                            {order.item_not_in_catalog && (
                              <span className="info-badge" title="Item not found in your catalog">Not in catalog</span>
                            )}
                          </div>
                        </td>
                        <td className="delivery-cell">
                          {order.delivery_date ? (
                            <span className="delivery-badge">D: {order.delivery_date}</span>
                          ) : (
                            <span className="text-muted">Not specified</span>
                          )}
                        </td>
                        <td className="amount-cell">
                          {order.amount ? (
                            <span className="amount-text">Rs.{Number(order.amount).toLocaleString("en-IN")}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="status-cell">
                          <span className={`payment-pill pill-${status}`}>
                            {status === "paid" && "OK "}
                            {status === "pending" && "Pending "}
                            {status === "advance" && "Adv "}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="actions-cell" style={{ textAlign: "right" }}>
                          <div className="table-actions-group">
                            {status !== "paid" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success"
                                onClick={() => onMarkPaid(order._id)}
                                disabled={isUpdating}
                                title="Mark as paid"
                              >
                                {isUpdating ? <Spinner size="small" color="#16a34a" /> : "Mark Paid"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleReminderClick(order._id)}
                              disabled={isGettingReminder}
                              title="Generate AI reminder"
                            >
                              {isGettingReminder ? "Generating..." : "Get Reminder"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
