document.addEventListener('DOMContentLoaded', function() {
    // DOM элементы
    const authBtn = document.getElementById('auth-btn');
    const cartBtn = document.getElementById('cart-btn');
    const authModal = document.getElementById('auth-modal');
    const cartModal = document.getElementById('cart-modal');
    const closeModals = document.querySelectorAll('.close-modal');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const verifyPhone = document.getElementById('verify-phone');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const categoryGrid = document.getElementById('category-grid');
    const productGrid = document.getElementById('product-grid');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const totalSum = document.getElementById('total-sum');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartCount = document.querySelector('.cart-count');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const verifyBtn = document.getElementById('verify-btn');

    // Состояние приложения
    let currentUser = null;
    let token = localStorage.getItem('nutterra_token');
    let cart = JSON.parse(localStorage.getItem('nutterra_cart')) || [];

    // Инициализация
    init();

    // Функции
    async function init() {
        updateCartCount();
        loadCategories();
        loadProducts();
        checkAuth();
        
        if (token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ phone: '', code: '' })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    currentUser = data.user;
                    authBtn.textContent = 'Мой профиль';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }
    }

    async function loadCategories() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            const categories = [...new Set(products.map(p => p.category))];
            
            categoryGrid.innerHTML = categories.map(category => {
                const categoryProducts = products.filter(p => p.category === category);
                const minPrice = Math.min(...categoryProducts.flatMap(p => Object.values(p.prices)));
                
                return `
                    <div class="category-card" data-category="${category}">
                        <div class="category-img" style="background-image: url('${categoryProducts[0].images[0] || '/images/default.jpg'}')"></div>
                        <div class="category-info">
                            <h3>${category}</h3>
                            <p>От ${minPrice} ₽</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.querySelectorAll('.category-card').forEach(card => {
                card.addEventListener('click', () => {
                    const category = card.dataset.category;
                    loadProducts(category);
                    window.scrollTo({ top: document.querySelector('.products').offsetTop - 100, behavior: 'smooth' });
                });
            });
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    async function loadProducts(category = '', search = '') {
        try {
            let url = '/api/products';
            if (category || search) {
                url += `?${category ? `category=${category}` : ''}${search ? `&search=${search}` : ''}`;
            }
            
            const response = await fetch(url);
            const products = await response.json();
            
            productGrid.innerHTML = products.map(product => {
                const weights = Object.keys(product.prices).map(weight => 
                    `<div class="weight-option" data-weight="${weight}">${weight} г</div>`
                ).join('');
                
                const badges = product.badges.map(badge => 
                    `<div class="product-badge">${badge}</div>`
                ).join('');
                
                return `
                    <div class="product-card" data-id="${product._id}">
                        ${badges}
                        <div class="product-img" style="background-image: url('${product.images[0] || '/images/default.jpg'}')"></div>
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <div class="product-price">${product.prices[Object.keys(product.prices)[0]]} ₽</div>
                            <div class="product-weights">${weights}</div>
                            <button class="add-to-cart">В корзину</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Обработчики для весов
            document.querySelectorAll('.weight-option').forEach(option => {
                option.addEventListener('click', function() {
                    this.parentElement.querySelectorAll('.weight-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    const price = this.closest('.product-card').querySelector('.product-price');
                    const productId = this.closest('.product-card').dataset.id;
                    const weight = this.dataset.weight;
                    const product = products.find(p => p._id === productId);
                    
                    if (product) {
                        price.textContent = `${product.prices[weight]} ₽`;
                    }
                });
            });
            
            // Обработчики для кнопок "В корзину"
            document.querySelectorAll('.add-to-cart').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const productCard = this.closest('.product-card');
                    const productId = productCard.dataset.id;
                    const activeWeight = productCard.querySelector('.weight-option.active').dataset.weight;
                    
                    if (!currentUser) {
                        alert('Для добавления в корзину необходимо авторизоваться');
                        authModal.style.display = 'flex';
                        return;
                    }
                    
                    try {
                        const response = await fetch('/api/cart', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                userId: currentUser._id,
                                productId: productId,
                                weight: activeWeight
                            })
                        });
                        
                        if (response.ok) {
                            const updatedCart = await response.json();
                            cart = updatedCart;
                            updateCartCount();
                            alert('Товар добавлен в корзину');
                        }
                    } catch (error) {
                        console.error('Failed to add to cart:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    }

    function updateCartUI() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Корзина пуста</p>';
            cartTotal.style.display = 'none';
            checkoutBtn.style.display = 'none';
        } else {
            cartItemsContainer.innerHTML = '';
            let total = 0;
            
            cart.forEach(item => {
                const price = item.price || 0;
                total += price;
                
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name || 'Товар'}</div>
                        <div class="cart-item-weight">${item.weight || '0'} г</div>
                    </div>
                    <div class="cart-item-price">${price} ₽</div>
                `;
                cartItemsContainer.appendChild(cartItem);
            });
            
            totalSum.textContent = total;
            cartTotal.style.display = 'block';
            checkoutBtn.style.display = 'block';
        }
    }

    function updateCartCount() {
        cartCount.textContent = cart.length;
    }

    function checkAuth() {
        if (token) {
            authBtn.textContent = 'Мой профиль';
        }
    }

    // Обработчики событий
    authBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        verifyForm.style.display = 'none';
    });

    cartBtn.addEventListener('click', () => {
        cartModal.style.display = 'flex';
        updateCartUI();
    });

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            authModal.style.display = 'none';
            cartModal.style.display = 'none';
        });
    });

    switchToRegister.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    switchToLogin.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    searchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            loadProducts('', searchTerm);
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    loginBtn.addEventListener('click', async () => {
        const phone = document.getElementById('login-phone').value.trim();
        
        if (phone) {
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ phone })
                });
                
                if (response.ok) {
                    verifyPhone.textContent = phone;
                    loginForm.style.display = 'none';
                    verifyForm.style.display = 'block';
                }
            } catch (error) {
                console.error('Login failed:', error);
            }
        }
    });

    verifyBtn.addEventListener('click', async () => {
        const phone = verifyPhone.textContent;
        const code = document.getElementById('verify-code').value.trim();
        
        if (code) {
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ phone, code })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    token = data.token;
                    currentUser = data.user;
                    localStorage.setItem('nutterra_token', token);
                    authModal.style.display = 'none';
                    authBtn.textContent = 'Мой профиль';
                }
            } catch (error) {
                console.error('Verification failed:', error);
            }
        }
    });

    checkoutBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: currentUser._id,
                    items: cart,
                    total: parseInt(totalSum.textContent),
                    address: 'Москва, ул. Примерная, 1' // В реальном приложении запрашивать у пользователя
                })
            });
            
            if (response.ok) {
                const order = await response.json();
                cart = [];
                updateCartCount();
                cartModal.style.display = 'none';
                alert(`Заказ #${order._id} успешно оформлен!`);
            }
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    });
});