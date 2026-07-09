import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, User, Plus, Check, Loader2, CreditCard } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    // Fetch products and users on mount
    Promise.all([
      fetch(`${API_URL}/api/products`).then(res => res.json()),
      fetch(`${API_URL}/api/users`).then(res => res.json())
    ])
    .then(([productsData, usersData]) => {
      if (productsData.products) setProducts(productsData.products);
      if (usersData.users && usersData.users.length > 0) {
        setUsers(usersData.users);
        setSelectedUser(usersData.users[0].id);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error("Error fetching data:", err);
      setLoading(false);
    });
  }, []);

  const addToCart = (product) => {
    setCart([...cart, product]);
    setOrderStatus(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0);

  const placeOrder = async () => {
    if (!selectedUser || cart.length === 0) return;
    
    setIsPlacingOrder(true);
    setOrderStatus(null);
    
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(selectedUser),
          total: cartTotal
        })
      });
      
      if (response.ok) {
        setCart([]);
        setOrderStatus('success');
      } else {
        setOrderStatus('error');
      }
    } catch (err) {
      console.error(err);
      setOrderStatus('error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '20vh' }}>
        <Loader2 className="animate-spin" size={48} color="#6366f1" />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="glass">
        <div className="logo">
          <Package size={28} />
          CloudMart
        </div>
        <div className="user-selector">
          <User size={20} color="#94a3b8" />
          <select 
            value={selectedUser || ''} 
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
            ))}
          </select>
        </div>
      </header>

      <div className="main-content">
        <div className="products-section">
          <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Featured Products</h2>
          <div className="grid">
            {products.map(product => (
              <div key={product.id} className="product-card glass">
                <div className="product-name">{product.name}</div>
                <div className="product-desc">{product.description}</div>
                <div className="product-footer">
                  <div className="product-price">${Number(product.price).toFixed(2)}</div>
                  <button onClick={() => addToCart(product)}>
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <div className="status-msg">No products available.</div>
          )}
        </div>

        <div className="cart-section glass">
          <div className="cart-header">
            <ShoppingCart size={24} />
            Your Cart
          </div>
          
          {orderStatus === 'success' && (
            <div className="success-msg">
              <Check size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Order placed successfully!
            </div>
          )}
          
          {cart.length === 0 ? (
            <div className="status-msg" style={{ padding: '2rem 0' }}>Your cart is empty.</div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item, idx) => (
                  <div key={idx} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">${Number(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button 
                className="checkout-btn" 
                onClick={placeOrder} 
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                {isPlacingOrder ? 'Processing...' : 'Checkout'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
