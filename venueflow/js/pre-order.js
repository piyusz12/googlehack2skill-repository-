/* ============================================
   VenueFlow — Concession Pre-Order System
   ============================================ */

const PreOrder = (() => {
  let container = null;
  let cart = [];
  let activeOrder = null;
  let currentCategory = 'burgers';

  const MENU = {
    burgers: [
      { id: 'b1', name: 'Classic Burger',   price: 9.99,  emoji: '🍔' },
      { id: 'b2', name: 'Cheese Burger',    price: 10.99, emoji: '🧀' },
      { id: 'b3', name: 'BBQ Bacon Burger', price: 12.99, emoji: '🥓' },
      { id: 'b4', name: 'Veggie Burger',    price: 10.49, emoji: '🥬' },
    ],
    pizza: [
      { id: 'p1', name: 'Margherita',       price: 8.99,  emoji: '🍕' },
      { id: 'p2', name: 'Pepperoni',        price: 10.99, emoji: '🍕' },
      { id: 'p3', name: 'BBQ Chicken',      price: 11.99, emoji: '🍗' },
      { id: 'p4', name: 'Hawaiian',         price: 10.49, emoji: '🍍' },
    ],
    snacks: [
      { id: 's1', name: 'Loaded Nachos',    price: 7.99,  emoji: '🧀' },
      { id: 's2', name: 'Soft Pretzel',     price: 5.99,  emoji: '🥨' },
      { id: 's3', name: 'Chicken Tenders',  price: 8.99,  emoji: '🍗' },
      { id: 's4', name: 'French Fries',     price: 4.99,  emoji: '🍟' },
    ],
    drinks: [
      { id: 'd1', name: 'Craft Beer',       price: 8.99,  emoji: '🍺' },
      { id: 'd2', name: 'Soda (Large)',     price: 4.49,  emoji: '🥤' },
      { id: 'd3', name: 'Lemonade',         price: 3.99,  emoji: '🍋' },
      { id: 'd4', name: 'Water Bottle',     price: 2.99,  emoji: '💧' },
    ],
    desserts: [
      { id: 'x1', name: 'Ice Cream Sundae', price: 6.99,  emoji: '🍨' },
      { id: 'x2', name: 'Churros',          price: 5.49,  emoji: '🥐' },
      { id: 'x3', name: 'Cotton Candy',     price: 4.99,  emoji: '🍭' },
      { id: 'x4', name: 'Cookies',          price: 3.99,  emoji: '🍪' },
    ],
  };

  const CATEGORIES = [
    { id: 'burgers',  emoji: '🍔', label: 'Burgers' },
    { id: 'pizza',    emoji: '🍕', label: 'Pizza' },
    { id: 'snacks',   emoji: '🍟', label: 'Snacks' },
    { id: 'drinks',   emoji: '🍺', label: 'Drinks' },
    { id: 'desserts', emoji: '🍨', label: 'Desserts' },
  ];

  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;
    render();
  }

  function render() {
    if (!container) return;

    container.innerHTML = '';

    // Active order display
    if (activeOrder) {
      renderActiveOrder();
      return;
    }

    // Category tabs
    const tabsHtml = CATEGORIES.map(c => `
      <button class="category-tab ${c.id === currentCategory ? 'active' : ''}" data-category="${c.id}">
        <span class="category-tab__emoji">${c.emoji}</span>
        ${c.label}
      </button>
    `).join('');

    // Menu items
    const items = MENU[currentCategory] || [];
    const menuHtml = items.map(item => `
      <div class="menu-item" data-item-id="${item.id}" data-category="${currentCategory}">
        <div class="menu-item__emoji">${item.emoji}</div>
        <div class="menu-item__name">${item.name}</div>
        <div class="menu-item__price">${Utils.formatCurrency(item.price)}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="category-tabs">${tabsHtml}</div>
      <div class="menu-grid">${menuHtml}</div>
      ${cart.length > 0 ? renderCart() : ''}
    `;

    // Event listeners
    container.querySelectorAll('.category-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.category;
        render();
      });
    });

    container.querySelectorAll('.menu-item').forEach(el => {
      el.addEventListener('click', () => {
        addToCart(el.dataset.itemId, el.dataset.category);
      });
    });

    // Cart button handlers
    if (cart.length > 0) {
      container.querySelectorAll('.cart-item__qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemId = btn.dataset.itemId;
          const action = btn.dataset.action;
          if (action === 'increment') incrementItem(itemId);
          else if (action === 'decrement') decrementItem(itemId);
        });
      });

      const checkoutBtn = container.querySelector('#checkout-btn');
      if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
      }

      const clearBtn = container.querySelector('#clear-cart-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          cart = [];
          render();
        });
      }
    }
  }

  function addToCart(itemId, category) {
    const existing = cart.find(c => c.itemId === itemId);
    if (existing) {
      existing.qty++;
    } else {
      const items = MENU[category];
      const item = items.find(i => i.id === itemId);
      if (item) {
        cart.push({ itemId: item.id, name: item.name, price: item.price, emoji: item.emoji, qty: 1 });
      }
    }
    Utils.showToast('Added to Cart', `Item added successfully`, 'success', 2000);
    render();
  }

  function incrementItem(itemId) {
    const item = cart.find(c => c.itemId === itemId);
    if (item) item.qty++;
    render();
  }

  function decrementItem(itemId) {
    const item = cart.find(c => c.itemId === itemId);
    if (item) {
      item.qty--;
      if (item.qty <= 0) {
        cart = cart.filter(c => c.itemId !== itemId);
      }
    }
    render();
  }

  function renderCart() {
    const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    // Find recommended pickup
    const zoneData = CrowdSimulator.getZoneData();
    const foodStands = Object.values(zoneData).filter(z => z.type === 'food').sort((a, b) => a.waitTime - b.waitTime);
    const bestStand = foodStands[0];

    const cartItemsHtml = cart.map(c => `
      <div class="cart-item">
        <div class="cart-item__info">
          <span>${c.emoji}</span>
          <span class="cart-item__name">${c.name}</span>
        </div>
        <div class="cart-item__controls">
          <button class="cart-item__qty-btn" data-item-id="${c.itemId}" data-action="decrement">−</button>
          <span class="cart-item__qty">${c.qty}</span>
          <button class="cart-item__qty-btn" data-item-id="${c.itemId}" data-action="increment">+</button>
          <span style="min-width:60px;text-align:right;font-weight:600;font-size:var(--font-size-sm)">${Utils.formatCurrency(c.price * c.qty)}</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="cart">
        <div class="cart__header">
          <span class="cart__title">🛒 Cart (${cart.reduce((s, c) => s + c.qty, 0)} items)</span>
          <button class="btn btn--sm btn--secondary" id="clear-cart-btn">Clear</button>
        </div>
        ${bestStand ? `
          <div class="pickup-recommendation">
            <span class="pickup-recommendation__icon">📍</span>
            Recommended pickup: <strong>${bestStand.name}</strong> (${bestStand.waitTime} min wait)
          </div>
        ` : ''}
        ${cartItemsHtml}
        <div class="cart__total">
          <span>Subtotal</span>
          <span>${Utils.formatCurrency(subtotal)}</span>
        </div>
        <div class="cart__total" style="border-top:none;padding-top:0;margin-top:0;font-size:var(--font-size-xs);color:var(--color-text-secondary);font-weight:400">
          <span>Tax (8%)</span>
          <span>${Utils.formatCurrency(tax)}</span>
        </div>
        <div class="cart__total" style="border-top:1px solid rgba(255,255,255,0.08)">
          <span>Total</span>
          <span style="color:var(--color-accent-emerald);font-size:var(--font-size-lg)">${Utils.formatCurrency(total)}</span>
        </div>
        <button class="btn btn--success btn--block btn--lg" id="checkout-btn" style="margin-top:var(--space-md)">
          Place Order — ${Utils.formatCurrency(total)}
        </button>
      </div>
    `;
  }

  function checkout() {
    if (cart.length === 0) return;

    const zoneData = CrowdSimulator.getZoneData();
    const foodStands = Object.values(zoneData).filter(z => z.type === 'food').sort((a, b) => a.waitTime - b.waitTime);
    const pickupStand = foodStands[0];

    activeOrder = {
      items: [...cart],
      total: cart.reduce((sum, c) => sum + c.price * c.qty, 0) * 1.08,
      status: 'placed', // placed → preparing → ready
      pickup: pickupStand?.name || 'Stand',
      timestamp: Date.now(),
    };

    cart = [];
    Utils.showToast('Order Placed! 🎉', `Pick up at ${activeOrder.pickup}`, 'success');
    render();

    // Simulate order progress
    setTimeout(() => {
      if (activeOrder) {
        activeOrder.status = 'preparing';
        Utils.showToast('Order Update', 'Your order is being prepared! 🍳', 'info');
        render();
      }
    }, 8000);

    setTimeout(() => {
      if (activeOrder) {
        activeOrder.status = 'ready';
        Utils.showToast('Order Ready! 🎉', `Pick up at ${activeOrder.pickup}`, 'success');
        render();
      }
    }, 16000);
  }

  function renderActiveOrder() {
    const steps = ['placed', 'preparing', 'ready'];
    const currentStep = steps.indexOf(activeOrder.status);

    const stepsHtml = steps.map((step, i) => {
      const isCompleted = i < currentStep;
      const isActive = i === currentStep;
      const labels = { placed: 'Placed', preparing: 'Preparing', ready: 'Ready' };
      const icons = { placed: '📝', preparing: '🍳', ready: '✅' };

      return `
        <div class="order-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
          <div class="order-step__dot">${icons[step]}</div>
          <div class="order-step__label">${labels[step]}</div>
          ${i < steps.length - 1 ? '<div class="order-step__connector"></div>' : ''}
        </div>
      `;
    }).join('');

    const itemsList = activeOrder.items.map(item =>
      `<div class="cart-item">
        <div class="cart-item__info">
          <span>${item.emoji}</span>
          <span class="cart-item__name">${item.name} × ${item.qty}</span>
        </div>
        <span style="font-weight:600;font-size:var(--font-size-sm)">${Utils.formatCurrency(item.price * item.qty)}</span>
      </div>`
    ).join('');

    container.innerHTML = `
      <div class="order-card">
        <div class="card__header">
          <span class="card__title">🧾 Active Order</span>
          <span class="badge badge--blue">Order #${Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
        </div>
        <div class="order-steps" style="margin: var(--space-xl) 0">
          ${stepsHtml}
        </div>
        <div class="pickup-recommendation">
          <span class="pickup-recommendation__icon">📍</span>
          Pickup at: <strong>${activeOrder.pickup}</strong>
        </div>
        ${itemsList}
        <div class="cart__total">
          <span>Total</span>
          <span style="color:var(--color-accent-emerald);font-size:var(--font-size-lg)">${Utils.formatCurrency(activeOrder.total)}</span>
        </div>
        ${activeOrder.status === 'ready' ? `
          <button class="btn btn--primary btn--block" id="new-order-btn" style="margin-top:var(--space-lg)">
            ✨ Place New Order
          </button>
        ` : ''}
      </div>
    `;

    const newOrderBtn = container.querySelector('#new-order-btn');
    if (newOrderBtn) {
      newOrderBtn.addEventListener('click', () => {
        activeOrder = null;
        render();
      });
    }
  }

  return { init };
})();
