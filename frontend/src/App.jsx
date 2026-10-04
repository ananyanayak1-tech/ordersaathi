import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import NewOrdersTab from "./components/NewOrdersTab";
import DashboardTab from "./components/DashboardTab";
import CatalogTab from "./components/CatalogTab";
import Toast from "./components/Toast";
import api from "./api";

/**
 * Match an order item name against catalog entries (name + aliases).
 * Returns the matching catalog item or null.
 */
function matchCatalogItem(orderItem, catalog) {
  if (!orderItem || !catalog || catalog.length === 0) return null;
  const needle = orderItem.toLowerCase().trim();
  for (const cat of catalog) {
    if ((cat.name || "").toLowerCase() === needle) return cat;
    if (cat.aliases && cat.aliases.some((a) => a.toLowerCase() === needle)) return cat;
  }
  return null;
}

/**
 * Given an order and catalog, compute verification flags.
 */
function verifyOrder(order, catalog) {
  const matched = matchCatalogItem(order.item, catalog);
  const item_not_in_catalog = !matched;
  let price_warning = false;
  if (matched && order.quantity && order.amount) {
    const expected = matched.price_per_unit * order.quantity;
    // Flag if stated amount differs from expected by more than 10%
    price_warning = Math.abs(expected - order.amount) > expected * 0.1;
  }
  return { ...order, item_not_in_catalog, price_warning, expected_amount: matched ? matched.price_per_unit * (order.quantity || 1) : null };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("new");
  const [chatText, setChatText] = useState("");
  const [extractedOrders, setExtractedOrders] = useState(null);
  const [savedOrders, setSavedOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isAddingCatalog, setIsAddingCatalog] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [reminderData, setReminderData] = useState(null);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    const newToast = { id, ...toast };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoadingOrders(true);
    try {
      const data = await api.getOrders();
      const list = Array.isArray(data) ? data : data?.orders || [];
      setSavedOrders(list);
    } catch (err) {
      if (!quiet) addToast({ type: "error", title: "Failed to load orders", message: err.message });
    } finally {
      if (!quiet) setIsLoadingOrders(false);
    }
  }, [addToast]);

  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const data = await api.getCatalog();
      setCatalog(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast({ type: "error", title: "Failed to load catalog", message: err.message });
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders(true);
    fetchCatalog();
  }, [fetchOrders, fetchCatalog]);

  const handleExtractOrders = async (text) => {
    setIsExtracting(true);
    try {
      const res = await api.extractOrders(text);
      const orders = res?.orders || [];
      // Run verification against catalog
      const verified = orders.map((o) => verifyOrder(o, catalog));
      setExtractedOrders(verified);
      if (orders.length > 0) {
        addToast({ type: "success", title: "Extraction successful", message: `Extracted ${orders.length} order item${orders.length > 1 ? "s" : ""}.` });
      } else {
        addToast({ type: "info", title: "No active orders", message: "The chat did not contain any active order requests." });
      }
    } catch (err) {
      addToast({ type: "error", title: "Extraction error", message: err.message || "Failed to extract orders." });
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmAllOrders = async () => {
    if (!extractedOrders || extractedOrders.length === 0) return;
    for (let i = 0; i < extractedOrders.length; i++) {
      const o = extractedOrders[i];
      if (!o.customer_name || !o.customer_name.trim()) {
        return addToast({ type: "error", title: "Validation error", message: `Item #${i + 1} (${o.item || "unnamed"}) is missing Customer Name.` });
      }
      if (!o.item || !o.item.trim()) {
        return addToast({ type: "error", title: "Validation error", message: `Item #${i + 1} is missing Item description.` });
      }
      if (o.quantity === null || o.quantity === undefined || isNaN(Number(o.quantity))) {
        return addToast({ type: "error", title: "Validation error", message: `Item #${i + 1} (${o.item}) requires a valid quantity.` });
      }
    }

    setIsConfirming(true);
    try {
      const res = await api.createOrders(extractedOrders);
      addToast({ type: "success", title: "Orders Confirmed!", message: `Saved ${res?.insertedCount || extractedOrders.length} order(s).` });
      setExtractedOrders(null);
      setChatText("");
      await fetchOrders(true);
      setActiveTab("dashboard");
    } catch (err) {
      addToast({ type: "error", title: "Save failed", message: err.message || "Failed to save confirmed orders." });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleMarkPaid = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      await api.updatePaymentStatus(orderId, "paid");
      addToast({ type: "success", title: "Status Updated", message: "Order marked as paid." });
      setSavedOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, payment_status: "paid" } : o)));
    } catch (err) {
      addToast({ type: "error", title: "Update failed", message: err.message });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleGetReminder = async (orderId) => {
    const targetOrder = savedOrders.find((o) => o._id === orderId);
    try {
      const res = await api.getReminder(orderId);
      setReminderData({ ...res, orderId, customer_name: targetOrder?.customer_name, item: targetOrder?.item });
      addToast({ type: "success", title: "Reminder Ready", message: "AI reminder generated in Hinglish!" });
    } catch (err) {
      addToast({ type: "error", title: "Reminder failed", message: err.message });
    }
  };

  const handleAddCatalogItem = async (item) => {
    setIsAddingCatalog(true);
    try {
      const newItem = await api.addCatalogItem(item);
      setCatalog((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
      addToast({ type: "success", title: "Item Added", message: `"${item.name}" added to your price list.` });
    } finally {
      setIsAddingCatalog(false);
    }
  };

  const handleDeleteCatalogItem = async (id) => {
    try {
      await api.deleteCatalogItem(id);
      setCatalog((prev) => prev.filter((c) => c._id !== id));
      addToast({ type: "success", title: "Deleted", message: "Item removed from catalog." });
    } catch (err) {
      addToast({ type: "error", title: "Delete failed", message: err.message });
    }
  };

  return (
    <div className="app-layout">
      <Toast toasts={toasts} onDismiss={removeToast} />
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "dashboard") fetchOrders(true);
          if (tab === "catalog") fetchCatalog();
        }}
        extractedCount={extractedOrders ? extractedOrders.length : 0}
        totalOrdersCount={savedOrders.length}
        catalogCount={catalog.length}
      />
      <main className="app-main">
        <div className="app-container">
          {activeTab === "new" && (
            <NewOrdersTab
              chatText={chatText}
              setChatText={setChatText}
              extractedOrders={extractedOrders}
              setExtractedOrders={setExtractedOrders}
              onExtract={handleExtractOrders}
              isExtracting={isExtracting}
              onConfirmAll={handleConfirmAllOrders}
              isConfirming={isConfirming}
              onSwitchToDashboard={() => setActiveTab("dashboard")}
            />
          )}
          {activeTab === "dashboard" && (
            <DashboardTab
              orders={savedOrders}
              isLoading={isLoadingOrders}
              onRefresh={() => fetchOrders(false)}
              onMarkPaid={handleMarkPaid}
              onGetReminder={handleGetReminder}
              updatingOrderId={updatingOrderId}
              reminderData={reminderData}
              onCloseReminder={() => setReminderData(null)}
              onGoToNewOrders={() => setActiveTab("new")}
            />
          )}
          {activeTab === "catalog" && (
            <CatalogTab
              catalog={catalog}
              isLoading={isLoadingCatalog}
              onAdd={handleAddCatalogItem}
              onDelete={handleDeleteCatalogItem}
              isAdding={isAddingCatalog}
            />
          )}
        </div>
      </main>
      <footer className="app-footer">
        <div className="footer-container">
          <p>© {new Date().getFullYear()} OrderSaathi • Made with care for Indian small businesses</p>
        </div>
      </footer>
    </div>
  );
}
