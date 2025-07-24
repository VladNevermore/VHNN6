require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');
const path = require('path');

console.log("DB Connection String:", process.env.MONGODB_URI);
console.log('Current directory files:', fs.readdirSync(__dirname));
console.log('Models directory files:', fs.readdirSync(path.join(__dirname, 'models')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://VladNevermore:Yjdsqgfhjkm1@cluster0.2k2w9ao.mongodb.net/nutterra?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const User = mongoose.model('User', {
    phone: String,
    name: String,
    password: String,
    cart: Array,
    orders: Array
});

const Product = mongoose.model('Product', {
    name: String,
    category: String,
    description: String,
    prices: Object,
    images: Array,
    badges: Array
});

const Order = mongoose.model('Order', {
    userId: String,
    items: Array,
    total: Number,
    status: String,
    createdAt: Date
});

async function seedDatabase() {
    const count = await Product.countDocuments();
    if (count === 0) {
        const products = [
            {
                name: "Фисташки соленые премиум",
                category: "pistachios",
                description: "Отборные соленые фисташки высшего качества",
                prices: { '100': 179, '200': 329, '400': 639 },
                images: ["/images/pistachios-premium.jpg"],
                badges: ["top"]
            },
            {
                name: "Грецкий орех отборный",
                category: "walnuts",
                description: "Отборные грецкие орехи",
                prices: { '100': 99, '200': 189, '400': 359 },
                images: ["/images/walnuts-select.jpg"],
                badges: ["new"]
            }
        ];
        await Product.insertMany(products);
    }
}

app.post('/api/auth/register', async(req, res) => {
    try {
        const { phone, name } = req.body;
        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.status(400).json({ message: 'Пользователь уже существует' });
        res.json({ success: true, message: 'Код отправлен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.post('/api/auth/verify', async(req, res) => {
    try {
        const { phone, code } = req.body;
        const user = new User({ phone, cart: [] });
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });
        res.json({ token, user: { phone: user.phone, cart: user.cart } });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('/api/products', async(req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};
        if (category) query.category = category;
        if (search) query.name = { $regex: search, $options: 'i' };
        const products = await Product.find(query);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.post('/api/cart', async(req, res) => {
    try {
        const { userId, productId, weight } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Товар не найден' });
        user.cart.push({ productId, weight, price: product.prices[weight] });
        await user.save();
        res.json(user.cart);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.post('/api/orders', async(req, res) => {
    try {
        const { userId, items, total, address } = req.body;
        const order = new Order({
            userId,
            items,
            total,
            address,
            status: 'processing',
            createdAt: new Date()
        });
        await order.save();
        await User.findByIdAndUpdate(userId, { cart: [] });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await seedDatabase();
});
const adminAuth = require('./middleware/adminAuth');
const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');

app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.get('/api/admin/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/api/admin/products', adminAuth, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при создании товара' });
  }
});

app.put('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при обновлении товара' });
  }
});

app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Товар удален' });
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при удалении товара' });
  }
});

app.post('/api/admin/init', async (req, res) => {
  try {
    const admin = new Admin({
      login: 'admin',
      password: 'admin123'
    });
    await admin.save();
    res.status(201).json({ message: 'Admin created' });
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const admin = await Admin.findOne({ login });
    
    if (!admin) return res.status(401).json({ message: 'Auth failed' });
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Auth failed' });
    
    const token = jwt.sign(
      { login: admin.login, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error });
  }
});
