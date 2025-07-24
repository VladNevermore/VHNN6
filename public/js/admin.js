document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('adminToken')) {
    window.location.href = '/admin/login.html';
    return;
  }

  loadProducts();
  document.getElementById('add-product').addEventListener('click', showProductForm);
});

async function loadProducts() {
  try {
    const response = await fetch('/api/admin/products', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    });
    const products = await response.json();
    renderProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderProducts(products) {
  const container = document.getElementById('products-list');
  container.innerHTML = products.map(product => `
    <div class="product-item">
      <h3>${product.name}</h3>
      <p>Категория: ${product.category}</p>
      <button onclick="editProduct('${product._id}')">Редактировать</button>
      <button onclick="deleteProduct('${product._id}')">Удалить</button>
    </div>
  `).join('');
}

async function deleteProduct(id) {
  try {
    await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    });
    loadProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
  }
}

function showProductForm() {
  const formHtml = `
    <div id="product-form">
      <h3>Добавить товар</h3>
      <input type="text" id="product-name" placeholder="Название">
      <input type="text" id="product-category" placeholder="Категория">
      <button onclick="saveProduct()">Сохранить</button>
    </div>
  `;
  document.getElementById('products-list').insertAdjacentHTML('afterbegin', formHtml);
}

async function saveProduct() {
  const productData = {
    name: document.getElementById('product-name').value,
    category: document.getElementById('product-category').value
  };

  try {
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(productData)
    });
    loadProducts();
  } catch (error) {
    console.error('Error saving product:', error);
  }
}