let currentCategorySlide = 0;
let currentBannerSlide = 0;
let isSignUpMode = false;
let isAdmin = JSON.parse(localStorage.getItem('isAdmin') || 'false');
let currentEditGameIndex = null;
let currentEditBannerIndex = null;
let currentEditProductId = null;
let countdownInterval = null;

// Cache localStorage data
let cachedUsers = null;
let cachedGames = null;
let cachedBanners = null;
let cachedProducts = null;
let cachedCart = null;

const adminKeys = {
  key1: 'X7B9Q2L4M6N8P3C5',
  key2: 'A1D5K9Z3W7T2Y6Q8',
  key3: 'M4P7X2L9C1N5B3Q8'
};

const gamePageMap = {
  'Roblox': 'roblox.html',
  'Free Fire': 'freefire.html',
  'Liên Quân Mobile': 'lienquan.html'
};

// Simple SHA-256 hash function
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function goToCheckout() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart.length === 0) {
    showToast('Giỏ hàng trống! Vui lòng thêm sản phẩm trước khi thanh toán.', 'error');
    return;
  }
  localStorage.setItem('checkoutItems', JSON.stringify(cart));
  window.location.href = 'checkout.html';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const themeToggle = document.querySelector('.theme-toggle');
  themeToggle.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
  localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

function loadTheme() {
  const theme = localStorage.getItem('theme');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.querySelector('.theme-toggle').textContent = '☀️';
  }
}

function toggleContextMenu(event, type, index) {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể sử dụng tính năng này!', 'error');
    return;
  }
  event.preventDefault();
  const contextMenu = document.getElementById(`${type}-context-menu`);
  if (contextMenu) {
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.dataset[`${type}Index`] = index;
    contextMenu.classList.add('active');
    document.addEventListener('click', function hideMenu(e) {
      if (!contextMenu.contains(e.target)) {
        contextMenu.classList.remove('active');
        document.removeEventListener('click', hideMenu);
      }
    });
  }
}

function toggleLanguageMenu() {
  openModal('language-modal');
  loadLanguage();
}

function saveLanguage() {
  const selectedLang = document.querySelector('input[name="language"]:checked');
  if (selectedLang) {
    localStorage.setItem('language', selectedLang.value);
    showToast('Đã lưu ngôn ngữ!');
    closeModal('language-modal');
  } else {
    showToast('Vui lòng chọn ngôn ngữ!', 'error');
  }
}

function loadLanguage() {
  const lang = localStorage.getItem('language') || 'vi';
  const radio = document.querySelector(`input[name="language"][value="${lang}"]`);
  if (radio) radio.checked = true;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    if (modalId === 'top-up-modal') {
      initTopUpModal();
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function openAuthModal() {
  isSignUpMode = false;
  updateAuthModal();
  openModal('auth-modal');
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  updateAuthModal();
}

function updateAuthModal() {
  const modalTitle = document.getElementById('modal-title');
  const authButton = document.querySelector('#auth-modal .neon-btn');
  const toggleText = document.querySelector('.toggle-auth');
  if (modalTitle && authButton && toggleText) {
    modalTitle.textContent = isSignUpMode ? 'Đăng ký' : 'Đăng nhập';
    authButton.textContent = isSignUpMode ? 'Đăng ký' : 'Xác nhận';
    toggleText.textContent = isSignUpMode ? 'Đã có tài khoản? Đăng nhập ngay!' : 'Chưa có tài khoản? Đăng ký!';
  }
}

function openAdminModal() {
  openModal('admin-modal');
}

function openSearchModal() {
  openModal('search-modal');
}

function openTopUpModal() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username) {
    showToast('Vui lòng đăng nhập trước khi nạp tiền!', 'error');
    openModal('auth-modal');
    return;
  }
  openModal('top-up-modal');
}

function initTopUpModal() {
  const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
  const forms = {
    card: document.getElementById('card-payment'),
    bank: document.getElementById('bank-payment'),
    wallet: document.getElementById('wallet-payment'),
    credit: document.getElementById('credit-payment')
  };

  paymentMethods.forEach(method => {
    method.addEventListener('change', () => {
      Object.values(forms).forEach(form => form.style.display = 'none');
      forms[method.value].style.display = 'flex';
    });
  });

  forms.card.style.display = 'flex';
  Object.keys(forms).forEach(key => {
    if (key !== 'card') forms[key].style.display = 'none';
  });

  // Preview biên lai trong modal nạp tiền
  const bankReceiptInput = document.getElementById('bank-receipt');
  const bankReceiptPreview = document.getElementById('bank-receipt-preview');
  if (bankReceiptInput && bankReceiptPreview) {
    bankReceiptInput.addEventListener('change', () => {
      const file = bankReceiptInput.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          bankReceiptPreview.src = e.target.result;
          bankReceiptPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        bankReceiptPreview.style.display = 'none';
        showToast('Vui lòng chọn file ảnh!', 'error');
      }
    });
  }
}

function processTopUp() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username) {
    showToast('Vui lòng đăng nhập trước khi nạp tiền!', 'error');
    openAuthModal();
    closeModal('top-up-modal');
    return;
  }

  const selectedMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
  if (!selectedMethod) {
    showToast('Vui lòng chọn phương thức thanh toán!', 'error');
    closeModal('top-up-modal');
    return;
  }

  let transaction = {
    id: Date.now().toString(),
    username: user.username,
    method: selectedMethod,
    date: new Date().toISOString(),
    status: 'pending'
  };
  let amount = 0;

  try {
    if (selectedMethod === 'card') {
      const cardType = document.getElementById('card-type').value;
      const cardCode = document.getElementById('card-code').value.trim();
      const cardSerial = document.getElementById('card-serial').value.trim();
      if (!cardCode || !cardSerial) {
        showToast('Vui lòng nhập mã thẻ và số seri!', 'error');
        closeModal('top-up-modal');
        return;
      }
      if (!/^\d{12,16}$/.test(cardCode) || !/^\d{10,14}$/.test(cardSerial)) {
        showToast('Mã thẻ hoặc số seri không hợp lệ!', 'error');
        closeModal('top-up-modal');
        return;
      }
      amount = 100000; // Giả lập
      transaction = { ...transaction, cardType, cardCode, cardSerial, amount };
      finalizeTopUp(transaction);
    } else if (selectedMethod === 'bank') {
      amount = parseInt(document.getElementById('bank-amount').value) || 0;
      const receipt = document.getElementById('bank-receipt').files[0];
      if (amount <= 0) {
        showToast('Số tiền phải lớn hơn 0!', 'error');
        closeModal('top-up-modal');
        return;
      }
      if (!receipt || !receipt.type.startsWith('image/')) {
        showToast('Vui lòng tải lên biên lai là file ảnh!', 'error');
        closeModal('top-up-modal');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
          showToast('Không thể đọc file ảnh biên lai!', 'error');
          closeModal('top-up-modal');
          return;
        }
        transaction = { ...transaction, amount, receiptName: receipt.name, receiptDataUrl: dataUrl };
        finalizeTopUp(transaction);
      };
      reader.onerror = () => {
        showToast('Lỗi khi đọc file ảnh biên lai!', 'error');
        closeModal('top-up-modal');
      };
      reader.readAsDataURL(receipt);
      return; // Chờ bất đồng bộ
    } else if (selectedMethod === 'wallet') {
      const walletId = document.getElementById('wallet-id').value.trim();
      amount = parseInt(document.getElementById('wallet-amount').value) || 0;
      if (!walletId || amount <= 0) {
        showToast('Vui lòng nhập ID ví và số tiền hợp lệ!', 'error');
        closeModal('top-up-modal');
        return;
      }
      transaction = { ...transaction, walletId, amount };
      finalizeTopUp(transaction);
    } else if (selectedMethod === 'credit') {
      const cardNumber = document.getElementById('credit-card-number').value.trim();
      const expiry = document.getElementById('credit-expiry').value.trim();
      const cvv = document.getElementById('credit-cvv').value.trim();
      if (!cardNumber || !expiry || !cvv) {
        showToast('Vui lòng nhập đầy đủ thông tin thẻ tín dụng!', 'error');
        closeModal('top-up-modal');
        return;
      }
      if (!/^\d{16}$/.test(cardNumber) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3}$/.test(cvv)) {
        showToast('Thông tin thẻ tín dụng không hợp lệ!', 'error');
        closeModal('top-up-modal');
        return;
      }
      amount = 100000; // Giả lập
      transaction = { ...transaction, cardNumber: cardNumber.slice(-4), amount };
      finalizeTopUp(transaction);
    }
  } catch (error) {
    showToast(`Lỗi xử lý giao dịch: ${error.message}`, 'error');
    closeModal('top-up-modal');
  }
}

function finalizeTopUp(transaction) {
  let topupTransactions = JSON.parse(localStorage.getItem('topupTransactions') || '[]');
  topupTransactions.push(transaction);
  localStorage.setItem('topupTransactions', JSON.stringify(topupTransactions));
  let admin = JSON.parse(localStorage.getItem('admin') || '{}');
  admin.topupRequests = admin.topupRequests || [];
  admin.topupRequests.unshift(transaction);
  localStorage.setItem('admin', JSON.stringify(admin));
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  let user = users.find(u => u.username === transaction.username);
  if (user) {
    user.notifications = user.notifications || [];
    user.notifications.unshift({
      message: `Giao dịch nạp tiền ${transaction.amount.toLocaleString('vi-VN')} VNĐ đang chờ duyệt.`,
      date: new Date().toLocaleString(),
      type: 'topup',
      status: 'pending'
    });
    user.topUpHistory = user.topUpHistory || [];
    user.topUpHistory.push(transaction);
    localStorage.setItem('users', JSON.stringify(users));
    let current = JSON.parse(localStorage.getItem('user') || '{}');
    if (current.username === user.username) localStorage.setItem('user', JSON.stringify(user));
  }
  closeModal('top-up-modal');
  showToast('Giao dịch nạp tiền đã được gửi, đang chờ duyệt!');
  setTimeout(() => window.location.href = 'account.html', 1200);
}

function processPayment() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username) {
    showToast('Vui lòng đăng nhập để thanh toán!', 'error');
    openAuthModal();
    return;
  }

  if (!user.shippingAddress || !user.phone) {
    showToast('Vui lòng cập nhật địa chỉ và số điện thoại trong tài khoản!', 'error');
    return;
  }

  const selectedItems = JSON.parse(localStorage.getItem('checkoutItems') || '[]');
  if (selectedItems.length === 0) {
    showToast('Không có sản phẩm nào để thanh toán!', 'error');
    window.location.href = 'cart.html';
    return;
  }

  let total = selectedItems.reduce((sum, item) => {
    const selectedOption = item.options.find(opt => opt.value === item.selectedOption);
    const price = selectedOption ? selectedOption.price : 0;
    return sum + price * item.quantity;
  }, 0);

  if (total <= 0) {
    showToast('Lỗi tính tiền! Vui lòng thử lại.', 'error');
    return;
  }

  if (user.balance < total) {
    showToast('Số dư không đủ! Vui lòng nạp thêm tiền.', 'error');
    window.location.href = 'index.html';
    return;
  }

  user.balance -= total;
  user.orders = user.orders || [];
  user.orders.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    items: selectedItems,
    total: total,
    status: 'pending'
  });

  updateUserData(user);

  let cachedCart = JSON.parse(localStorage.getItem('cart') || '[]');
  const selectedItemIds = selectedItems.map(item => item.id);
  cachedCart = cachedCart.filter(item => !selectedItemIds.includes(item.id));
  localStorage.setItem('cart', JSON.stringify(cachedCart));

  localStorage.removeItem('checkoutItems');

  showToast('Thanh toán thành công! Đơn hàng đang được xử lý.');
  setTimeout(() => window.location.href = 'account.html', 3000);
}

function openAddGameModal() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể thêm game!', 'error');
    return;
  }
  currentEditGameIndex = null;
  const imageUrlInput = document.getElementById('game-image-url');
  const gameNameInput = document.getElementById('game-name');
  const imagePreview = document.getElementById('game-image-preview');
  if (imageUrlInput && gameNameInput && imagePreview) {
    imageUrlInput.value = '';
    gameNameInput.value = '';
    imagePreview.src = 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/add.png';
  }
  openModal('add-game-modal');
}

function openAddProductModal() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể thêm sản phẩm!', 'error');
    return;
  }
  currentEditProductId = null;
  const idInput = document.getElementById('product-id');
  const nameInput = document.getElementById('product-name');
  const gameSelect = document.getElementById('product-game');
  const priceInput = document.getElementById('product-price');
  const imageUrlInput = document.getElementById('product-image-url');
  const imagePreview = document.getElementById('product-image-preview');
  if (idInput && nameInput && gameSelect && priceInput && imageUrlInput && imagePreview) {
    idInput.value = '';
    nameInput.value = '';
    gameSelect.value = 'Roblox';
    priceInput.value = '';
    imageUrlInput.value = '';
    imagePreview.src = 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/add.png';
  }
  openModal('add-product-modal');
}

function openSetHotDealTimeModal() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể chỉnh sửa hot deal!', 'error');
    return;
  }
  const inputs = ['hot-deal-days', 'hot-deal-hours', 'hot-deal-minutes', 'hot-deal-seconds'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  openModal('set-hot-deal-time-modal');
}

function validateImageUrl(url, callback) {
  const img = new Image();
  img.onload = () => callback(true);
  img.onerror = () => callback(false);
  img.src = url;
}

function previewAvatar() {
  const url = document.getElementById('avatar-url').value.trim();
  const avatarImg = document.getElementById('account-avatar');
  if (url && avatarImg) {
    validateImageUrl(url, (isValid) => {
      avatarImg.src = isValid ? url : 'https://via.placeholder.com/100?text=Invalid+Image';
    });
  }
}

function updateGameImagePreview() {
  if (!isAdmin) return;
  const url = document.getElementById('game-image-url').value;
  const preview = document.getElementById('game-image-preview');
  if (url && preview) {
    validateImageUrl(url, (isValid) => {
      preview.src = isValid ? url : 'https://via.placeholder.com/150?text=Invalid+Image';
    });
  }
}

function updateProductImagePreview() {
  if (!isAdmin) return;
  const url = document.getElementById('product-image-url').value;
  const preview = document.getElementById('product-image-preview');
  if (url && preview) {
    validateImageUrl(url, (isValid) => {
      preview.src = isValid ? url : 'https://via.placeholder.com/150?text=Invalid+Image';
    });
  }
}

function updateBannerImagePreview() {
  if (!isAdmin) return;
  const url = document.getElementById('banner-image-url').value;
  const preview = document.getElementById('banner-image-preview');
  if (url && preview) {
    validateImageUrl(url, (isValid) => {
      preview.src = isValid ? url : 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/gamer.png?text=Invalid+Image';
    });
  }
}

function saveGame() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể lưu game!', 'error');
    return;
  }
  const url = document.getElementById('game-image-url').value;
  const name = document.getElementById('game-name').value;
  if (!url || !name) {
    showToast('Vui lòng điền đầy đủ URL ảnh và tên game!', 'error');
    return;
  }
  validateImageUrl(url, (isValid) => {
    if (!isValid) {
      showToast('URL ảnh không hợp lệ!', 'error');
      return;
    }
    cachedGames = cachedGames || JSON.parse(localStorage.getItem('gamesData') || '[]');
    if (currentEditGameIndex !== null) {
      cachedGames[currentEditGameIndex] = { name, image: url };
    } else {
      cachedGames.push({ name, image: url });
    }
    localStorage.setItem('gamesData', JSON.stringify(cachedGames));
    loadGames();
    closeModal('add-game-modal');
    showToast('Đã lưu game thành công!');
  });
}

function saveProduct() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể lưu sản phẩm!', 'error');
    return;
  }
  const id = currentEditProductId || Date.now().toString();
  const name = document.getElementById('product-name').value.trim();
  const game = document.getElementById('product-game').value;
  const price = parseInt(document.getElementById('product-price').value);
  const imageUrl = document.getElementById('product-image-url').value.trim();
  if (!name || !price || !imageUrl) {
    showToast('Vui lòng điền đầy đủ thông tin sản phẩm!', 'error');
    return;
  }
  if (price <= 0) {
    showToast('Giá sản phẩm phải lớn hơn 0!', 'error');
    return;
  }
  validateImageUrl(imageUrl, (isValid) => {
    if (!isValid) {
      showToast('URL ảnh không hợp lệ!', 'error');
      return;
    }
    cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
    if (currentEditProductId) {
      cachedProducts = cachedProducts.map(p => p.id === currentEditProductId ? { id, name, game, price, image: imageUrl } : p);
    } else {
      cachedProducts.push({ id, name, game, price, image: imageUrl });
    }
    localStorage.setItem('productsData', JSON.stringify(cachedProducts));
    loadProducts();
    closeModal('add-product-modal');
    showToast('Đã lưu sản phẩm thành công!');
  });
}

function editGame() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể chỉnh sửa game!', 'error');
    return;
  }
  const index = document.getElementById('game-context-menu').dataset.gameIndex;
  cachedGames = cachedGames || JSON.parse(localStorage.getItem('gamesData') || '[]');
  if (cachedGames[index]) {
    currentEditGameIndex = parseInt(index);
    const imageUrlInput = document.getElementById('game-image-url');
    const gameNameInput = document.getElementById('game-name');
    const imagePreview = document.getElementById('game-image-preview');
    if (imageUrlInput && gameNameInput && imagePreview) {
      imageUrlInput.value = cachedGames[index].image;
      gameNameInput.value = cachedGames[index].name;
      imagePreview.src = cachedGames[index].image;
    }
    openModal('add-game-modal');
  }
}

function editProduct() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể chỉnh sửa sản phẩm!', 'error');
    return;
  }
  const index = document.getElementById('product-context-menu').dataset.productIndex;
  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
  if (cachedProducts[index]) {
    const product = cachedProducts[index];
    currentEditProductId = product.id;
    const idInput = document.getElementById('product-id');
    const nameInput = document.getElementById('product-name');
    const gameSelect = document.getElementById('product-game');
    const priceInput = document.getElementById('product-price');
    const imageUrlInput = document.getElementById('product-image-url');
    const imagePreview = document.getElementById('product-image-preview');
    if (idInput && nameInput && gameSelect && priceInput && imageUrlInput && imagePreview) {
      idInput.value = product.id;
      nameInput.value = product.name;
      gameSelect.value = product.game;
      priceInput.value = product.price;
      imageUrlInput.value = product.image;
      imagePreview.src = product.image;
    }
    openModal('add-product-modal');
  }
}

function deleteGame() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể xóa game!', 'error');
    return;
  }
  const index = document.getElementById('game-context-menu').dataset.gameIndex;
  if (confirm('Bạn có chắc muốn xóa game này?')) {
    cachedGames = cachedGames || JSON.parse(localStorage.getItem('gamesData') || '[]');
    cachedGames.splice(index, 1);
    localStorage.setItem('gamesData', JSON.stringify(cachedGames));
    loadGames();
    showToast('Đã xóa game!');
  }
}

function deleteProduct() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể xóa sản phẩm!', 'error');
    return;
  }
  const index = document.getElementById('product-context-menu').dataset.productIndex;
  if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
    cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
    cachedProducts.splice(index, 1);
    localStorage.setItem('productsData', JSON.stringify(cachedProducts));
    loadProducts();
    showToast('Đã xóa sản phẩm!');
  }
}

function saveBanner() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể lưu banner!', 'error');
    return;
  }
  const url = document.getElementById('banner-image-url').value;
  if (!url) {
    showToast('Vui lòng nhập URL ảnh banner!', 'error');
    return;
  }
  validateImageUrl(url, (isValid) => {
    if (!isValid) {
      showToast('URL ảnh banner không hợp lệ!', 'error');
      return;
    }
    cachedBanners = cachedBanners || JSON.parse(localStorage.getItem('bannersData') || '[]');
    if (cachedBanners[currentEditBannerIndex]) {
      cachedBanners[currentEditBannerIndex].image = url;
      localStorage.setItem('bannersData', JSON.stringify(cachedBanners));
      loadBanners();
      closeModal('edit-banner-modal');
      showToast('Đã lưu banner thành công!');
    }
  });
}

function editBanner() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể chỉnh sửa banner!', 'error');
    return;
  }
  const index = document.getElementById('banner-context-menu').dataset.bannerIndex;
  cachedBanners = cachedBanners || JSON.parse(localStorage.getItem('bannersData') || '[]');
  if (cachedBanners[index]) {
    currentEditBannerIndex = parseInt(index);
    const imageUrlInput = document.getElementById('banner-image-url');
    const imagePreview = document.getElementById('banner-image-preview');
    if (imageUrlInput && imagePreview) {
      imageUrlInput.value = cachedBanners[index].image;
      imagePreview.src = cachedBanners[index].image;
    }
    openModal('edit-banner-modal');
  }
}

function saveHotDealTime() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể chỉnh sửa hot deal!', 'error');
    return;
  }
  const days = parseInt(document.getElementById('hot-deal-days').value) || 0;
  const hours = parseInt(document.getElementById('hot-deal-hours').value) || 0;
  const minutes = parseInt(document.getElementById('hot-deal-minutes').value) || 0;
  const seconds = parseInt(document.getElementById('hot-deal-seconds').value) || 0;
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  if (totalSeconds <= 0) {
    showToast('Vui lòng nhập thời gian hợp lệ (ít nhất 1 giây)!', 'error');
    return;
  }
  const endTime = new Date(Date.now() + totalSeconds * 1000).toISOString();
  localStorage.setItem('hotDealEndTime', endTime);
  loadHotDeals();
  closeModal('set-hot-deal-time-modal');
  showToast('Đã set thời gian hot deal thành công!');
}

function startHotDealCountdown() {
  const countdownElement = document.getElementById('hot-deal-countdown');
  if (!countdownElement) return;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const endTime = localStorage.getItem('hotDealEndTime');
    if (!endTime || new Date(endTime) < new Date()) {
      countdownElement.textContent = '';
      clearInterval(countdownInterval);
      loadHotDeals();
      return;
    }
    const timeLeft = new Date(endTime) - new Date();
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    countdownElement.textContent = `${days} ngày ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

function prevSlide(section) {
  const carouselInner = document.querySelector(`#${section} .carousel-inner`);
  const items = carouselInner.querySelectorAll('.carousel-item');
  currentCategorySlide = (currentCategorySlide - 1 + items.length) % items.length;
  carouselInner.style.transform = `translateX(-${currentCategorySlide * 100 / items.length}%)`;
}

function nextSlide(section) {
  const carouselInner = document.querySelector(`#${section} .carousel-inner`);
  const items = carouselInner.querySelectorAll('.carousel-item');
  currentCategorySlide = (currentCategorySlide + 1) % items.length;
  carouselInner.style.transform = `translateX(-${currentCategorySlide * 100 / items.length}%)`;
}

function checkLoginStatus() {
  cachedUsers = cachedUsers || JSON.parse(localStorage.getItem('users') || '[]');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const authButtons = document.querySelector('.auth-buttons');
  const userInfo = document.querySelector('.user-info');
  if (user && user.username) {
    if (authButtons) authButtons.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'inline-flex';
      userInfo.querySelector('.username').textContent = user.username;
      userInfo.querySelector('.user-avatar').src = user.avatar || 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/gamer.png';
    }
  } else {
    if (authButtons) authButtons.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    if (window.location.pathname.includes('account.html') || window.location.pathname.includes('manage_products.html')) {
      showToast('Vui lòng đăng nhập để truy cập trang này!', 'error');
      window.location.href = 'index.html';
    }
  }
  toggleAdminFeatures();
  loadTheme();
}

function goToAccount() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && user.username) {
    window.location.href = 'account.html';
  } else {
    openAuthModal();
  }
}

function goToCart() {
  window.location.href = 'cart.html';
}

async function handleAuth() {
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  if (!usernameInput || !passwordInput) {
    showToast('Lỗi hệ thống: Không tìm thấy trường nhập liệu!', 'error');
    return;
  }
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    showToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'error');
    return;
  }
  cachedUsers = cachedUsers || JSON.parse(localStorage.getItem('users') || '[]');
  if (isSignUpMode) {
    if (cachedUsers.find(u => u.username === username)) {
      showToast('Tên đăng nhập đã tồn tại!', 'error');
      return;
    }
    const hashedPassword = await hashPassword(password);
    const newUser = {
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      gender: 'male',
      email: '',
      phone: '',
      avatar: 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/gamer.png',
      notifications: [],
      serverNotifications: [],
      orders: [],
      vouchers: []
    };
    cachedUsers.push(newUser);
    localStorage.setItem('users', JSON.stringify(cachedUsers));
    localStorage.setItem('user', JSON.stringify(newUser));
    closeModal('auth-modal');
    checkLoginStatus();
    showToast('Đăng ký thành công!');
  } else {
    const hashedPassword = await hashPassword(password);
    const user = cachedUsers.find(u => u.username === username && u.password === hashedPassword);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      closeModal('auth-modal');
      checkLoginStatus();
      showToast('Đăng nhập thành công!');
    } else {
      showToast('Tên đăng nhập hoặc mật khẩu không đúng!', 'error');
    }
  }
}

async function changePassword() {
  const currentPassword = document.getElementById('current-password').value.trim();
  const newPassword = document.getElementById('new-password').value.trim();
  const confirmPassword = document.getElementById('confirm-password').value.trim();
  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('Vui lòng điền đầy đủ các trường mật khẩu!', 'error');
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast('Mật khẩu mới và xác nhận không khớp!', 'error');
    return;
  }
  if (newPassword.length < 6) {
    showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
    return;
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const hashedCurrentPassword = await hashPassword(currentPassword);
  if (hashedCurrentPassword !== user.password) {
    showToast('Mật khẩu hiện tại không đúng!', 'error');
    return;
  }
  const hashedNewPassword = await hashPassword(newPassword);
  user.password = hashedNewPassword;
  updateUserData(user);
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  showToast('Đổi mật khẩu thành công!');
}

function handleAdminLogin() {
  const key1 = document.getElementById('admin-key1').value;
  const key2 = document.getElementById('admin-key2').value;
  const key3 = document.getElementById('admin-key3').value;
  if (key1 === adminKeys.key1 && key2 === adminKeys.key2 && key3 === adminKeys.key3) {
    isAdmin = true;
    localStorage.setItem('isAdmin', 'true');
    closeModal('admin-modal');
    toggleAdminFeatures();
    showToast('Đăng nhập quản trị viên thành công!');
  } else {
    showToast('Mật khẩu quản trị viên không đúng!', 'error');
  }
}

function logoutAdmin() {
  isAdmin = false;
  localStorage.setItem('isAdmin', 'false');
  toggleAdminFeatures();
  showToast('Đã đăng xuất quản trị viên!');
}

function toggleAdminFeatures() {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = isAdmin ? 'block' : 'none';
  });
}

function saveTopUpTransaction(user, transaction) {
  user.topUpHistory = user.topUpHistory || [];
  user.topUpHistory.push(transaction);
  updateUserData(user);
}

function updateUserData(user) {
  let cachedUsers = JSON.parse(localStorage.getItem('users') || '[]');
  cachedUsers = cachedUsers.map(u => u.username === user.username ? user : u);
  localStorage.setItem('users', JSON.stringify(cachedUsers));
  localStorage.setItem('user', JSON.stringify(user));
}

function deleteUser() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (confirm(`Bạn có chắc muốn xóa tài khoản "${user.username}"?`)) {
    cachedUsers = cachedUsers || JSON.parse(localStorage.getItem('users') || '[]');
    cachedUsers = cachedUsers.filter(u => u.username !== user.username);
    localStorage.setItem('users', JSON.stringify(cachedUsers));
    showToast('Tài khoản đã được xóa!');
    logout();
  }
}

function logout() {
  isAdmin = false;
  localStorage.removeItem('user');
  localStorage.setItem('isAdmin', 'false');
  checkLoginStatus();
  window.location.href = 'index.html';
}

function loadCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  const cartEmptyMessage = document.getElementById('cart-empty-message');
  if (!cartItemsContainer || !cartCount || !cartTotal || !cartEmptyMessage) return;

  let cachedCart = JSON.parse(localStorage.getItem('cart') || '[]');
  cartItemsContainer.innerHTML = '';
  if (cachedCart.length === 0) {
    cartEmptyMessage.style.display = 'block';
    cartCount.textContent = '0';
    cartTotal.textContent = 'Tổng: đ0';
    return;
  }

  cartEmptyMessage.style.display = 'none';
  cartCount.textContent = cachedCart.length;
  let total = 0;

  cachedCart.forEach(item => {
    const selectedOption = item.options.find(opt => opt.value === item.selectedOption);
    const price = selectedOption ? selectedOption.price : 0;
    const subtotal = price * item.quantity;
    total += subtotal;

    const div = document.createElement('div');
    div.className = 'cart-product-item neon-card';
    div.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/150?text=Error'}" alt="${item.name}" class="cart-product-image" onerror="this.src='https://via.placeholder.com/150?text=Error';">
      <div class="cart-product-info">
        <h4>${item.name}</h4>
        <p>Phân loại: ${item.selectedOption}</p>
        <p>Đơn giá: đ${price.toLocaleString()}</p>
      </div>
      <div class="cart-product-quantity">
        <div class="quantity-control">
          <button class="neon-btn" onclick="updateCartItemQuantity('${item.id}', -1)">-</button>
          <input type="number" class="neon-input" value="${item.quantity}" min="1" onchange="updateCartItemQuantity('${item.id}', this.value)">
          <button class="neon-btn" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
        </div>
        <p>Tổng giá: đ${subtotal.toLocaleString()}</p>
      </div>
      <button class="neon-btn danger" onclick="removeFromCart('${item.id}')">Xóa</button>
    `;
    cartItemsContainer.appendChild(div);
  });

  cartTotal.textContent = `Tổng: đ${total.toLocaleString()}`;
}

function loadCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  if (!cartItemsContainer) return;

  let cachedCart = JSON.parse(localStorage.getItem('cart') || '[]');
  cartItemsContainer.innerHTML = '';
  cachedCart.forEach(item => {
    const selectedOption = item.options.find(opt => opt.value === item.selectedOption);
    const price = selectedOption ? selectedOption.price : 0;
    const subtotal = price * item.quantity;

    const div = document.createElement('div');
    div.className = 'cart-product-item neon-card';
    div.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/150?text=Error'}" alt="${item.name}" class="cart-product-image" onerror="this.src='https://via.placeholder.com/150?text=Error';">
      <div class="cart-product-info">
        <h4>${item.name}</h4>
        <p>Phân loại: ${item.selectedOption}</p>
        <p>Đơn giá: đ${price.toLocaleString()}</p>
      </div>
      <div class="cart-product-quantity">
        <div class="quantity-control">
          <button class="neon-btn" onclick="updateCartItemQuantity('${item.id}', -1)">-</button>
          <input type="number" class="neon-input" value="${item.quantity}" min="1" onchange="updateCartItemQuantity('${item.id}', this.value)">
          <button class="neon-btn" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
        </div>
        <p>Tổng giá: đ${subtotal.toLocaleString()}</p>
      </div>
      <button class="neon-btn danger" onclick="removeFromCart('${item.id}')">Xóa</button>
    `;
    cartItemsContainer.appendChild(div);
  });
}

function updateCartItemQuantity(itemId, quantity) {
  quantity = parseInt(quantity) || 1;
  if (quantity < 1) quantity = 1;
  let cachedCart = JSON.parse(localStorage.getItem('cart') || '[]');
  cachedCart = cachedCart.map(item => item.id === itemId ? { ...item, quantity } : item);
  localStorage.setItem('cart', JSON.stringify(cachedCart));
  loadCartItems();
}

function removeFromCart(itemId) {
  let cachedCart = JSON.parse(localStorage.getItem('cart') || '[]');
  cachedCart = cachedCart.filter(item => item.id !== itemId);
  localStorage.setItem('cart', JSON.stringify(cachedCart));
  loadCartItems();
}

function handleCheckout() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Kiểm tra đăng nhập
  if (!user.username) {
    showToast('Vui lòng đăng nhập để thanh toán!', 'error');
    openAuthModal();
    return;
  }

  // Kiểm tra thông tin giao hàng
  if (!user.shippingAddress || !user.phone) {
    showToast('Vui lòng cập nhật địa chỉ và số điện thoại trong tài khoản!', 'error');
    window.location.href = 'account.html';
    return;
  }

  // Lấy toàn bộ giỏ hàng
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart.length === 0) {
    showToast('Giỏ hàng trống! Vui lòng thêm sản phẩm.', 'error');
    window.location.href = 'cart.html';
    return;
  }

  // Tính tổng tiền
  let total = cart.reduce((sum, item) => {
    const selectedOption = item.options.find(opt => opt.value === item.selectedOption);
    const price = selectedOption ? selectedOption.price : 0;
    return sum + price * item.quantity;
  }, 0);

  if (total <= 0) {
    showToast('Lỗi tính tiền! Vui lòng thử lại.', 'error');
    return;
  }

  // Kiểm tra số dư
  if (user.balance < total) {
    showToast('Số dư không đủ! Vui lòng nạp thêm tiền.', 'error');
    openTopUpModal();
    return;
  }

  // Cập nhật số dư và tạo đơn hàng
  user.balance -= total;
  user.orders = user.orders || [];
  user.orders.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    items: cart,
    total: total,
    status: 'pending'
  });

  // Cập nhật thông tin người dùng
  updateUserData(user);

  // Xóa giỏ hàng
  localStorage.setItem('cart', JSON.stringify([]));

  // Hiển thị thông báo và chuyển hướng
  showToast('Thanh toán thành công! Đơn hàng đang được xử lý.');
  setTimeout(() => window.location.href = 'account.html', 2000);
}

function loadGames() {
  const carousel = document.getElementById('game-carousel');
  if (!carousel) return;
  cachedGames = cachedGames || JSON.parse(localStorage.getItem('gamesData') || '[]');
  if (cachedGames.length === 0) {
    cachedGames = [
      { name: 'Roblox', image: 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/Roblox.jpg' },
      { name: 'Free Fire', image: 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/FreeFire.jpg' },
      { name: 'Liên Quân Mobile', image: 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/LQ.jpg' }
    ];
    localStorage.setItem('gamesData', JSON.stringify(cachedGames));
  }
  carousel.innerHTML = '';
  cachedGames.forEach((game, index) => {
    const div = document.createElement('div');
    div.className = 'carousel-item';
    div.dataset.index = index;
    const pageUrl = gamePageMap[game.name] || '#';
    div.innerHTML = `
      <a href="${pageUrl}">
        <img src="${game.image}" alt="${game.name}" onerror="this.src='https://i.imgur.com/ZARruCO.jpg';">
        <h3>${game.name}</h3>
      </a>
    `;
    if (isAdmin) {
      div.addEventListener('contextmenu', (e) => toggleContextMenu(e, 'game', index));
    }
    carousel.appendChild(div);
  });
}

function loadBanners() {
  const carousel = document.getElementById('banner-carousel');
  if (!carousel) return;
  cachedBanners = cachedBanners || JSON.parse(localStorage.getItem('bannersData') || '[]');
  if (cachedBanners.length === 0) {
    cachedBanners = [
      { title: 'Mua & Bán Vật Phẩm Huyền Thoại Ngay!', desc: 'Khám phá các vật phẩm độc đáo trong tựa game yêu thích của bạn.', image: 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/home_banner.png' },
      { title: 'Hè đến! Sale đến!', desc: 'Giảm 30% cho tất cả Gamepass tại Roblox shop!', image: 'https://raw.githubusercontent.com/Sokax-sys/Photos/master/Roblox_banner.jpg' }
    ];
    localStorage.setItem('bannersData', JSON.stringify(cachedBanners));
  }
  carousel.innerHTML = '';
  cachedBanners.forEach((banner, index) => {
    const div = document.createElement('div');
    div.className = `hero-slide ${index === 0 ? 'active' : ''}`;
    div.dataset.index = index;
    div.style.backgroundImage = `url('${banner.image}')`;
    div.style.backgroundSize = 'cover';
    div.style.backgroundPosition = 'center';
    div.innerHTML = `
      <div class="hero-content">
        <h1 class="neon-text">${banner.title}</h1>
        <p>${banner.desc}</p>
        <button class="neon-btn">Xem Thêm</button>
      </div>
    `;
    if (isAdmin) {
      div.addEventListener('contextmenu', (e) => toggleContextMenu(e, 'banner', index));
    }
    carousel.appendChild(div);
  });
  carousel.innerHTML += `
    <button class="hero-control prev" onclick="prevBannerSlide()">◄</button>
    <button class="hero-control next" onclick="nextBannerSlide()">►</button>
  `;
}

function prevBannerSlide() {
  const slides = document.querySelectorAll('.hero-slide');
  slides[currentBannerSlide].classList.remove('active');
  currentBannerSlide = (currentBannerSlide - 1 + slides.length) % slides.length;
  slides[currentBannerSlide].classList.add('active');
}

function nextBannerSlide() {
  const slides = document.querySelectorAll('.hero-slide');
  slides[currentBannerSlide].classList.remove('active');
  currentBannerSlide = (currentBannerSlide + 1) % slides.length;
  slides[currentBannerSlide].classList.add('active');
}

function loadHotDeals() {
  const hotDealList = document.getElementById('hot-deal-list');
  const noHotDeals = document.getElementById('no-hot-deals');
  if (!hotDealList || !noHotDeals) return;
  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('selectedHotDealProducts') || '[]');
  const endTime = localStorage.getItem('hotDealEndTime');
  hotDealList.innerHTML = '';
  if (cachedProducts.length === 0 || !endTime || new Date(endTime) < new Date()) {
    noHotDeals.style.display = 'block';
    if (countdownInterval) clearInterval(countdownInterval);
    const countdownElement = document.getElementById('hot-deal-countdown');
    if (countdownElement) countdownElement.textContent = '';
  } else {
    noHotDeals.style.display = 'none';
    cachedProducts.forEach(product => {
      const div = document.createElement('div');
      div.className = 'hot-deal-item neon-card';
      div.innerHTML = `
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://raw.githubusercontent.com/Sokax-sys/Photos/master/Hot_deal.png';">
        <h4>${product.name}</h4>
        <p>Giá: ${product.price} VNĐ</p>
        <p>Hết hạn: ${new Date(endTime).toLocaleString()}</p>
        <button class="neon-btn" onclick="addToCart('Hot Deal', '${product.name}')">Thêm vào giỏ</button>
      `;
      hotDealList.appendChild(div);
    });
    startHotDealCountdown();
  }
}

function loadTransactions() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể xem giao dịch!', 'error');
    return;
  }
  const transactionList = document.getElementById('transaction-list');
  if (!transactionList) return;
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const transactions = admin.topupRequests || [];
  transactionList.innerHTML = '';
  if (transactions.length === 0) {
    transactionList.innerHTML = '<p style="color:#ffea00">Không có giao dịch chờ duyệt.</p>';
    return;
  }
  transactions.forEach((tx, idx) => {
    const div = document.createElement('div');
    div.className = 'transaction-item neon-card';
    let receiptHtml = tx.receiptDataUrl && tx.receiptDataUrl.startsWith('data:image/')
      ? `<img src="${tx.receiptDataUrl}" alt="Biên lai" style="max-width: 100px; max-height: 100px; object-fit: cover; cursor: pointer;" onclick="showReceiptModal('${tx.receiptDataUrl.replace(/'/g, "\\'")}')">`
      : `<p>Không có biên lai${tx.receiptName ? ': ' + tx.receiptName : ''}</p>`;
    div.innerHTML = `
      <div>
        <p>Mã giao dịch: ${tx.id || idx}</p>
        <p>Người dùng: ${tx.username}</p>
        <p>Số tiền: ${(tx.amount || 0).toLocaleString('vi-VN')} VNĐ</p>
        <p>Ngày: ${new Date(tx.date).toLocaleString()}</p>
        <p>Trạng thái: <span id="tx-status-${idx}">${tx.status}</span></p>
        ${receiptHtml}
      </div>
      <div class="transaction-actions">
        <button class="neon-btn" onclick="approveTopup(${idx})">Duyệt</button>
        <button class="neon-btn danger" onclick="rejectTopup(${idx})">Từ chối</button>
      </div>
    `;
    transactionList.appendChild(div);
  });
}

function approveTransaction(username, transactionId) {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể duyệt giao dịch!', 'error');
    return;
  }
  cachedUsers = cachedUsers || JSON.parse(localStorage.getItem('users') || '[]');
  let user = cachedUsers.find(u => u.username === username);
  if (user && user.topUpHistory) {
    let transaction = user.topUpHistory.find(t => t.id === transactionId);
    if (transaction && transaction.status === 'pending') {
      transaction.status = 'approved';
      user.balance = (user.balance || 0) + transaction.amount;
      updateUserData(user);
      loadTransactions();
      showToast(`Đã duyệt giao dịch ${transactionId}!`);
    }
  }
}

function approveTopup(idx) {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể duyệt giao dịch!', 'error');
    return;
  }
  let admin = JSON.parse(localStorage.getItem('admin') || '{}');
  let tx = admin.topupRequests[idx];
  if (!tx || tx.status !== 'pending') return;
  tx.status = 'approved';
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  let user = users.find(u => u.username === tx.username);
  if (user) {
    user.balance = (user.balance || 0) + (tx.amount || 0);
    user.notifications = user.notifications || [];
    user.notifications.unshift({
      message: `Giao dịch nạp tiền ${tx.amount.toLocaleString('vi-VN')} VNĐ đã được duyệt!`,
      date: new Date().toLocaleString(),
      type: 'topup',
      status: 'approved'
    });
    user.topUpHistory = user.topUpHistory || [];
    user.topUpHistory = user.topUpHistory.map(t => t.id === tx.id ? { ...t, status: 'approved' } : t);
    localStorage.setItem('users', JSON.stringify(users));
    let current = JSON.parse(localStorage.getItem('user') || '{}');
    if (current.username === user.username) localStorage.setItem('user', JSON.stringify(user));
  }
  admin.topupRequests.splice(idx, 1);
  localStorage.setItem('admin', JSON.stringify(admin));
  loadTransactions();
  showToast(`Đã duyệt giao dịch ${tx.id || idx}!`);
}

function rejectTopup(idx) {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể từ chối giao dịch!', 'error');
    return;
  }
  let admin = JSON.parse(localStorage.getItem('admin') || '{}');
  let tx = admin.topupRequests[idx];
  if (!tx || tx.status !== 'pending') return;
  tx.status = 'rejected';
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  let user = users.find(u => u.username === tx.username);
  if (user) {
    user.notifications = user.notifications || [];
    user.notifications.unshift({
      message: `Giao dịch nạp tiền ${tx.amount.toLocaleString('vi-VN')} VNĐ đã bị từ chối!`,
      date: new Date().toLocaleString(),
      type: 'topup',
      status: 'rejected'
    });
    user.topUpHistory = user.topUpHistory || [];
    user.topUpHistory = user.topUpHistory.map(t => t.id === tx.id ? { ...t, status: 'rejected' } : t);
    localStorage.setItem('users', JSON.stringify(users));
    let current = JSON.parse(localStorage.getItem('user') || '{}');
    if (current.username === user.username) localStorage.setItem('user', JSON.stringify(user));
  }
  admin.topupRequests.splice(idx, 1);
  localStorage.setItem('admin', JSON.stringify(admin));
  loadTransactions();
  showToast(`Đã từ chối giao dịch ${tx.id || idx}!`);
}

function rejectTransaction(username, transactionId) {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể từ chối giao dịch!', 'error');
    return;
  }
  cachedUsers = cachedUsers || JSON.parse(localStorage.getItem('users') || '[]');
  let user = cachedUsers.find(u => u.username === username);
  if (user && user.topUpHistory) {
    let transaction = user.topUpHistory.find(t => t.id === transactionId);
    if (transaction && transaction.status === 'pending') {
      transaction.status = 'rejected';
      updateUserData(user);
      loadTransactions();
      showToast(`Đã từ chối giao dịch ${transactionId}!`);
    }
  }
}

function loadProducts() {
  const productList = document.getElementById('product-list');
  if (!productList) return;
  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
  // Sử dụng key riêng cho product.html
  let selectedProducts = [];
  if (window.location.pathname.includes('product.html')) {
    selectedProducts = JSON.parse(localStorage.getItem('selectedProductCards') || '[]');
  } else {
    selectedProducts = JSON.parse(localStorage.getItem('selectedHotDealProducts') || '[]');
  }
  productList.innerHTML = '';
  let filteredProducts = cachedProducts;
  if (window.location.pathname.includes('roblox.html')) {
    filteredProducts = cachedProducts.filter(p => p.game === 'Roblox');
  } else if (window.location.pathname.includes('freefire.html')) {
    filteredProducts = cachedProducts.filter(p => p.game === 'Free Fire');
  } else if (window.location.pathname.includes('lienquan.html')) {
    filteredProducts = cachedProducts.filter(p => p.game === 'Liên Quân Mobile');
  }
  filteredProducts.forEach((product, index) => {
    const div = document.createElement('div');
    div.className = `product-item neon-card ${selectedProducts.find(p => p.id === product.id) ? 'selected' : ''}`;
    div.dataset.id = product.id;
    div.dataset.index = index;
    div.innerHTML = `
      <img src="${product.image}" alt="${product.name}" onerror="showToast('Lỗi tải hình ảnh sản phẩm!', 'error'); this.src='https://via.placeholder.com/150?text=Error';">
      <h4>${product.name}</h4>
      <p>Game: ${product.game}</p>
      <p>Giá: ${product.price} VNĐ</p>
    `;
    if (!window.location.pathname.includes('product.html')) {
      div.onclick = () => {
        window.location.href = `product.html?id=${product.id}`;
      };
      if (isAdmin) {
        div.addEventListener('contextmenu', (e) => toggleContextMenu(e, 'product', index));
      }
    }
    // Sửa logic chọn sản phẩm cho product.html
    if (isAdmin && window.location.pathname.includes('product.html')) {
      div.addEventListener('click', () => {
        let selected = JSON.parse(localStorage.getItem('selectedProductCards') || '[]');
        const idx = selected.findIndex(p => p.id === product.id);
        if (idx >= 0) {
          selected.splice(idx, 1);
          div.classList.remove('selected');
        } else {
          selected.push(product);
          div.classList.add('selected');
        }
        localStorage.setItem('selectedProductCards', JSON.stringify(selected));
      });
      div.addEventListener('contextmenu', (e) => toggleContextMenu(e, 'product', index));
    }
    productList.appendChild(div);
  });
}

// Nếu là trang product.html
if (window.location.pathname.includes('product.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (productId) {
      // Render Product Detail Page
      cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
      const product = cachedProducts.find(p => p.id === productId);
      if (product) {
        // Hiển thị thông tin sản phẩm lên trang
        const detailSection = document.createElement('section');
        detailSection.className = 'product-detail-page';
        detailSection.innerHTML = `
          <div class=\"product-detail\">
            <img src=\"${product.image}\" alt=\"${product.name}\" onerror=\"this.src='https://via.placeholder.com/150?text=Error';\">
            <h2>${product.name}</h2>
            <div id=\"product-rating\"></div>
            <p>Game: ${product.game}</p>
            <p>Giá: ${product.price} VNĐ</p>
            <label>Số lượng: </label>
            <input type=\"number\" id=\"product-quantity\" class=\"neon-input\" value=\"1\" min=\"1\">
            <div class=\"product-actions\">
              <button class=\"neon-btn\" id=\"add-to-cart-btn\">Thêm vào giỏ</button>
              <button class=\"neon-btn\" id=\"buy-now-btn\">Mua ngay</button>
            </div>
            <div id=\"product-reviews\" class=\"reviews-section\">
              <h3>Đánh giá</h3>
              <div id=\"review-list\"></div>
              <div class=\"review-form\">
                <input type=\"number\" id=\"review-rating\" class=\"neon-input\" min=\"1\" max=\"5\" placeholder=\"Đánh giá (1-5)\">
                <textarea id=\"review-text\" class=\"neon-input\" placeholder=\"Nhập nhận xét của bạn\"></textarea>
                <button class=\"neon-btn\" id=\"submit-review-btn\">Gửi đánh giá</button>
              </div>
            </div>
          </div>
        `;
        const main = document.querySelector('main');
        if (main) {
          main.innerHTML = '';
          main.appendChild(detailSection);
        }
        document.getElementById('add-to-cart-btn').onclick = function() {
          const quantity = parseInt(document.getElementById('product-quantity').value) || 1;
          addToCart(product.game, product.name, quantity);
        };
        document.getElementById('buy-now-btn').onclick = function() {
          const quantity = parseInt(document.getElementById('product-quantity').value) || 1;
          addToCart(product.game, product.name, quantity);
          window.location.href = 'cart.html';
        };
        const ratings = JSON.parse(localStorage.getItem('productRatings') || '{}')[productId] || { avg: 5.0, count: 10415, reviews: [] };
        const stars = '★'.repeat(Math.round(ratings.avg)) + '☆'.repeat(5 - Math.round(ratings.avg));
        document.getElementById('product-rating').innerHTML = `${stars} (${ratings.count} đánh giá)`;
        const reviewList = document.getElementById('review-list');
        reviewList.innerHTML = '';
        ratings.reviews.forEach(review => {
          const div = document.createElement('div');
          div.className = 'review-item';
          div.innerHTML = `
            <p>${review.text} (${review.rating} sao)</p>
            <small>${review.user} - ${new Date(review.date).toLocaleDateString()}</small>
          `;
          reviewList.appendChild(div);
        });
        document.getElementById('submit-review-btn').onclick = function() {
          const rating = parseInt(document.getElementById('review-rating').value);
          const text = document.getElementById('review-text').value.trim();
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (!user.username) {
            showToast('Vui lòng đăng nhập để đánh giá!', 'error');
            return;
          }
          if (!rating || rating < 1 || rating > 5 || !text) {
            showToast('Vui lòng nhập đủ thông tin đánh giá!', 'error');
            return;
          }
          const allRatings = JSON.parse(localStorage.getItem('productRatings') || '{}');
          if (!allRatings[productId]) allRatings[productId] = { avg: 5.0, count: 0, reviews: [] };
          allRatings[productId].reviews.push({ user: user.username, rating, text, date: new Date().toISOString() });
          allRatings[productId].count++;
          allRatings[productId].avg = allRatings[productId].reviews.reduce((sum, r) => sum + r.rating, 0) / allRatings[productId].count;
          localStorage.setItem('productRatings', JSON.stringify(allRatings));
          showToast('Đã gửi đánh giá!');
          window.location.reload();
        };
      }
    } else {
      // Không có id, hiển thị danh sách sản phẩm để admin chọn (đổi màu)
      loadProducts();
    }
  });
}

function searchProducts() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;
  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
  searchResults.innerHTML = '';
  const filteredProducts = cachedProducts.filter(p => p.name.toLowerCase().includes(query) || p.game.toLowerCase().includes(query));
  if (filteredProducts.length === 0) {
    searchResults.innerHTML = '<p>Không tìm thấy sản phẩm nào!</p>';
  } else {
    filteredProducts.forEach(product => {
      const div = document.createElement('div');
      div.className = 'product-item neon-card';
      div.innerHTML = `
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/150?text=Error';">
        <h4>${product.name}</h4>
        <p>Game: ${product.game}</p>
        <p>Giá: ${product.price} VNĐ</p>
        <button class="neon-btn" onclick="addToCart('${product.game}', '${product.name}')">Thêm vào giỏ</button>
      `;
      searchResults.appendChild(div);
    });
  }
}

// Thêm biến toàn cục
let currentProduct = null;
let currentProductSlide = 0;

// Hàm hiển thị chi tiết sản phẩm
function loadProductDetail(productId) {
  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
  currentProduct = cachedProducts.find(p => p.id === productId);
  if (!currentProduct) {
    showToast('Sản phẩm không tồn tại!', 'error');
    return;
  }

  const nameEl = document.getElementById('product-name');
  const ratingEl = document.getElementById('product-rating');
  const ratingCountEl = document.getElementById('rating-count');
  const priceEl = document.getElementById('product-price');
  const locationEl = document.getElementById('delivery-location');
  const carousel = document.getElementById('product-image-carousel');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (nameEl && ratingEl && ratingCountEl && priceEl && locationEl && carousel) {
    nameEl.textContent = currentProduct.name;
    ratingEl.innerHTML = '★★★★★'.slice(0, Math.round(4)) + '☆'.repeat(5 - Math.round(4)); // Giả lập 4 sao
    ratingCountEl.textContent = 25; // Giả lập số lượt đánh giá
    priceEl.textContent = `${currentProduct.price} VNĐ`;
    locationEl.textContent = user.location || 'Hồ Chí Minh, Quận 1, Phường Nguyễn Cư Trinh';
    carousel.innerHTML = `
      <div class="carousel-item"><img src="${currentProduct.image}" alt="${currentProduct.name}" onerror="this.src='https://via.placeholder.com/150?text=Error';"></div>
      <div class="carousel-item"><img src="${currentProduct.image}" alt="${currentProduct.name}" onerror="this.src='https://via.placeholder.com/150?text=Error';"></div>
    `;
    loadAdminReview();
    loadUserReviews();
    document.getElementById('add-review-btn').style.display = canReview() ? 'block' : 'none';
  }
}

function prevProductSlide() {
  const items = document.querySelectorAll('#product-image-carousel .carousel-item');
  currentProductSlide = (currentProductSlide - 1 + items.length) % items.length;
  updateProductCarousel();
}

function nextProductSlide() {
  const items = document.querySelectorAll('#product-image-carousel .carousel-item');
  currentProductSlide = (currentProductSlide + 1) % items.length;
  updateProductCarousel();
}

function updateProductCarousel() {
  const carousel = document.getElementById('product-image-carousel');
  if (carousel) {
    carousel.style.transform = `translateX(-${currentProductSlide * 100}%)`;
  }
}

function updateQuantity(change) {
  let quantity = parseInt(document.getElementById('product-quantity').textContent) || 1;
  quantity = Math.max(1, quantity + change);
  document.getElementById('product-quantity').textContent = quantity;
}

function addToCartFromDetail() {
  const quantity = parseInt(document.getElementById('product-quantity').textContent) || 1;
  addToCart(currentProduct.game, currentProduct.name, quantity);
}

function handleCheckoutFromDetail() {
  const quantity = parseInt(document.getElementById('product-quantity').textContent) || 1;
  addToCart(currentProduct.game, currentProduct.name, quantity);
  handleCheckout();
}

function changeDeliveryLocation() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const newLocation = prompt('Nhập địa điểm vận chuyển mới:', user.location || '');
  if (newLocation) {
    user.location = newLocation;
    updateUserData(user);
    document.getElementById('delivery-location').textContent = newLocation;
    showToast('Đã cập nhật địa điểm vận chuyển!');
  }
}

function openAdminEditReviewModal() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể chỉnh sửa!', 'error');
    return;
  }
  const reviewInput = document.getElementById('admin-review-input');
  const adminReview = document.getElementById('admin-review').textContent || '';
  if (reviewInput) {
    reviewInput.value = adminReview;
    openModal('admin-edit-review-modal');
  }
}

function saveAdminReview() {
  if (!isAdmin) {
    showToast('Chỉ quản trị viên mới có thể lưu!', 'error');
    return;
  }
  const reviewInput = document.getElementById('admin-review-input').value.trim();
  if (reviewInput) {
    currentProduct.adminReview = reviewInput;
    localStorage.setItem('productsData', JSON.stringify(cachedProducts));
    loadAdminReview();
    closeModal('admin-edit-review-modal');
    showToast('Đã lưu đánh giá chi tiết!');
  }
}

function loadAdminReview() {
  const reviewEl = document.getElementById('admin-review');
  if (reviewEl && currentProduct.adminReview) {
    reviewEl.textContent = currentProduct.adminReview;
  }
}

function canReview() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username) return false;
  const orders = user.orders || [];
  return orders.some(order => order.items.some(item => item.name === currentProduct.name));
}

function openReviewModal() {
  if (!canReview()) {
    showToast('Chỉ người đã mua sản phẩm mới được đánh giá!', 'error');
    return;
  }
  openModal('review-modal');
}

function submitReview() {
  const reviewInput = document.getElementById('user-review-input').value.trim();
  if (!reviewInput) {
    showToast('Vui lòng nhập đánh giá!', 'error');
    return;
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const review = {
    id: Date.now().toString(),
    username: user.username,
    content: reviewInput,
    date: new Date().toISOString(),
    rating: 4 // Giả lập đánh giá 4 sao
  };
  currentProduct.reviews = currentProduct.reviews || [];
  currentProduct.reviews.push(review);
  localStorage.setItem('productsData', JSON.stringify(cachedProducts));
  closeModal('review-modal');
  loadUserReviews();
  showToast('Đã gửi đánh giá thành công!');
}

function loadUserReviews() {
  const reviewsEl = document.getElementById('user-reviews');
  if (reviewsEl && currentProduct.reviews) {
    reviewsEl.innerHTML = currentProduct.reviews.map(r => `
      <div class="review-item neon-card">
        <h4>${r.username}</h4>
        <p>${r.content}</p>
        <p>Ngày: ${new Date(r.date).toLocaleString()}</p>
        <p>Đánh giá: ${'★★★★☆'.slice(0, r.rating) + '☆'.repeat(5 - r.rating)}</p>
      </div>
    `).join('');
  }
}

// Modal phóng to ảnh biên lai dùng chung
function showReceiptModal(imgUrl) {
  const modal = document.getElementById('receipt-modal');
  if (!modal) {
    showToast('Lỗi: Không tìm thấy modal phóng to ảnh!', 'error');
    return;
  }
  const img = document.getElementById('receipt-modal-img');
  if (!imgUrl || !imgUrl.startsWith('data:image/')) {
    showToast('URL ảnh không hợp lệ!', 'error');
    return;
  }
  img.src = imgUrl;
  openModal('receipt-modal');
  modal.addEventListener('click', function handler(e) {
    if (e.target === modal || e.target === img) {
      closeModal('receipt-modal');
      modal.removeEventListener('click', handler);
    }
  });
  document.addEventListener('keydown', function escCloseModal(ev) {
    if (ev.key === 'Escape' && modal.classList.contains('active')) {
      closeModal('receipt-modal');
      document.removeEventListener('keydown', escCloseModal);
    }
  });
}

function closeReceiptModal() {
  closeModal('receipt-modal');
}
// Gọi khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (productId) loadProductDetail(productId);
});

function loadUserData() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username && window.location.pathname.includes('checkout.html')) {
    showToast('Vui lòng đăng nhập để thanh toán!', 'error');
    window.location.href = 'index.html';
    return;
  }
  const address = user.shippingAddress || 'Chưa cập nhật địa chỉ';
  const recipient = `${user.username || 'Chưa cập nhật'} (+84) ${user.phone || 'Chưa cập nhật'}`;
  const shippingAddressEl = document.getElementById('shipping-address');
  const recipientInfoEl = document.getElementById('recipient-info');
  if (shippingAddressEl) shippingAddressEl.textContent = address;
  if (recipientInfoEl) recipientInfoEl.textContent = recipient;
}

function switchContentSection(sectionId) {
  const sections = document.querySelectorAll('.content-section');
  const menuItems = document.querySelectorAll('.menu-item');
  sections.forEach(section => section.classList.remove('active'));
  menuItems.forEach(item => item.classList.remove('active'));
  const activeSection = document.getElementById(sectionId);
  const activeMenuItem = document.querySelector(`.menu-item[onclick="switchContentSection('${sectionId}')"]`);
  if (activeSection) activeSection.classList.add('active');
  if (activeMenuItem) activeMenuItem.classList.add('active');
  if (sectionId === 'order-history') loadOrders();
  if (sectionId === 'vouchers') loadVouchers();
  if (sectionId === 'notifications') loadNotifications();
}

function applyVoucher() {
  const voucherCode = document.getElementById('voucher-code').value.trim();
  const total = loadCartItems();
  const voucherMessage = document.getElementById('voucher-message');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!voucherCode) {
    voucherMessage.textContent = 'Vui lòng nhập mã voucher!';
    return;
  }

  const voucher = user.vouchers?.find(v => v.code === voucherCode && !v.used && new Date(v.expiry) > new Date());
  if (!voucher) {
    voucherMessage.textContent = 'Mã voucher không hợp lệ hoặc đã sử dụng!';
    return;
  }

  const discount = total * (voucher.discount / 100);
  const newTotal = total - discount;
  document.getElementById('total-amount').textContent = `Tổng: đ${newTotal.toLocaleString()}`;
  voucherMessage.textContent = `Áp dụng thành công! Giảm đ${discount.toLocaleString()}`;

  // Lưu trạng thái voucher đã sử dụng
  voucher.used = true;
  updateUserData(user);
}

function editShippingAddress() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const newAddress = prompt('Nhập địa chỉ giao hàng mới:', user.shippingAddress || '');
  if (newAddress) {
    user.shippingAddress = newAddress;
    updateUserData(user);
    loadUserData();
    showToast('Đã cập nhật địa chỉ giao hàng!');
  }
}

function editRecipientInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const newPhone = prompt('Nhập số điện thoại mới:', user.phone || '');
  if (newPhone && /^\+?\d{10,15}$/.test(newPhone)) {
    user.phone = newPhone;
    updateUserData(user);
    loadUserData();
    showToast('Đã cập nhật thông tin người nhận!');
  } else {
    showToast('Số điện thoại không hợp lệ!', 'error');
  }
}

function reloadCartOnPageShow() {
  if (window.location.pathname.includes('cart.html')) {
    loadCart();
  } else if (window.location.pathname.includes('checkout.html')) {
    loadCartItems();
  }
}

function saveAccountDetails() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username) {
    showToast('Vui lòng đăng nhập trước khi cập nhật thông tin!', 'error');
    return;
  }
  const usernameInput = document.getElementById('account-username');
  const genderSelect = document.getElementById('account-gender');
  const emailInput = document.getElementById('account-email');
  const phoneInput = document.getElementById('account-phone');
  const locationInput = document.getElementById('account-location');
  const newUsername = usernameInput.value.trim();
  if (newUsername && newUsername !== user.username) {
    cachedUsers = cachedUsers || JSON.parse(localStorage.getItem('users') || '[]');
    if (cachedUsers.find(u => u.username === newUsername)) {
      showToast('Tên đăng nhập đã tồn tại!', 'error');
      return;
    }
    user.username = newUsername;
  }
  if (emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
    showToast('Email không hợp lệ!', 'error');
    return;
  }
  if (phoneInput.value.trim() && !/^\+?\d{10,15}$/.test(phoneInput.value.trim())) {
    showToast('Số điện thoại không hợp lệ!', 'error');
    return;
  }
  user.gender = genderSelect.value;
  user.email = emailInput.value.trim();
  user.phone = phoneInput.value.trim();
  user.location = locationInput.value.trim() || 'Hồ Chí Minh';
  updateUserData(user);
  showToast('Cập nhật thông tin tài khoản thành công!');
}

function saveAvatar() {
  const url = document.getElementById('avatar-url').value.trim();
  if (!url) {
    showToast('Vui lòng nhập URL ảnh avatar!', 'error');
    return;
  }
  validateImageUrl(url, (isValid) => {
    if (!isValid) {
      showToast('URL ảnh không hợp lệ!', 'error');
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.username) {
      user.avatar = url;
      updateUserData(user);
      loadAccountAvatar();
      showToast('Đã cập nhật avatar thành công!');
    }
  });
}

function uploadAvatarFromFile() {
  const fileInput = document.getElementById('avatar-file');
  const avatarImg = document.getElementById('account-avatar');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file ảnh!', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      validateImageUrl(url, (isValid) => {
        if (isValid) {
          avatarImg.src = url;
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          user.avatar = url;
          updateUserData(user);
          document.getElementById('avatar-url').value = url;
          showToast('Đã tải avatar lên thành công!');
        } else {
          showToast('File ảnh không hợp lệ!', 'error');
        }
      });
    };
    reader.readAsDataURL(file);
  }
}

function loadAccountDetails() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.username) {
    document.getElementById('account-username').value = user.username;
    document.getElementById('account-gender').value = user.gender || 'male';
    document.getElementById('account-email').value = user.email || '';
    document.getElementById('account-phone').value = user.phone || '';
    loadAccountAvatar();
  }
}

function loadAccountAvatar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const avatarImg = document.getElementById('account-avatar');
  const avatarUrlInput = document.getElementById('avatar-url');
  if (avatarImg && user.avatar) {
    avatarImg.src = user.avatar;
    if (avatarUrlInput) avatarUrlInput.value = user.avatar;
  }
}

function loadOrders() {
  const orderList = document.getElementById('order-list');
  if (!orderList) return;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  orderList.innerHTML = '';
  if (!user.orders || user.orders.length === 0) {
    orderList.innerHTML = '<p>Chưa có đơn hàng nào!</p>';
    return;
  }
  user.orders.forEach(order => {
    const div = document.createElement('div');
    div.className = 'order-item neon-card';
    div.innerHTML = `
      <h4>Đơn hàng #${order.id}</h4>
      <p>Ngày đặt: ${new Date(order.date).toLocaleString()}</p>
      <p>Tổng tiền: ${order.total} VNĐ</p>
      <p>Phương thức thanh toán: ${order.paymentMethod}</p>
      <p>Trạng thái: ${order.status}</p>
    `;
    orderList.appendChild(div);
  });
}

function viewOrderDetails(orderId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const order = user.orders.find(o => o.id === orderId);
  if (!order) return;
  let details = `Chi tiết đơn hàng #${orderId}:\n`;
  order.items.forEach(item => {
    const price = item.options.find(opt => opt.value === item.selectedOption).price;
    details += `- ${item.name} (${item.game}): ${item.quantity} x ${price} VNĐ = ${item.quantity * price} VNĐ\n`;
  });
  details += `Tổng tiền: ${order.total} VNĐ\n`;
  details += `Ngày đặt: ${new Date(order.date).toLocaleString()}\n`;
  details += `Trạng thái: ${order.status}`;
  alert(details);
}

function loadVouchers() {
  const voucherList = document.getElementById('voucher-list');
  if (!voucherList) return;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  voucherList.innerHTML = '';
  if (!user.vouchers || user.vouchers.length === 0) {
    user.vouchers = [
      { id: 'VOUCHER1', code: 'SUMMER2025', discount: 10, expiry: '2025-12-31', used: false },
      { id: 'VOUCHER2', code: 'GAMEVAULT20', discount: 20, expiry: '2025-06-30', used: true }
    ];
    updateUserData(user);
  }
  user.vouchers.forEach(voucher => {
    const div = document.createElement('div');
    div.className = 'voucher-item neon-card';
    div.innerHTML = `
      <h4>Mã: ${voucher.code}</h4>
      <p>Giảm giá: ${voucher.discount}%</p>
      <p>Hết hạn: ${new Date(voucher.expiry).toLocaleDateString()}</p>
      <p>Trạng thái: ${voucher.used ? 'Đã sử dụng' : 'Chưa sử dụng'}</p>
    `;
    voucherList.appendChild(div);
  });
}

function openProductModal(productId) {
  const modal = document.getElementById('product-detail-modal');
  if (!modal) return;

  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
  const product = cachedProducts.find(p => p.id === productId);
  if (!product) return;

  // Lấy thông tin người dùng
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const deliveryLocation = user.location || 'Hồ Chí Minh'; // Giả lập, cần thêm vào account.html

  // Hiển thị thông tin sản phẩm
  document.getElementById('product-image').src = product.image;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').textContent = `Giá: ${product.price} VNĐ`;
  document.getElementById('delivery-text').textContent = deliveryLocation;

  // Giả lập đánh giá (cần lưu vào localStorage)
  const ratings = JSON.parse(localStorage.getItem('productRatings') || '{}')[productId] || { avg: 5.0, count: 10415, reviews: [] };
  const stars = '★'.repeat(Math.round(ratings.avg)) + '☆'.repeat(5 - Math.round(ratings.avg));
  document.getElementById('rating-stars').innerHTML = stars;
  document.getElementById('rating-count').textContent = ratings.count;

  // Hiển thị đánh giá
  const reviewList = document.getElementById('review-list');
  reviewList.innerHTML = '';
  ratings.reviews.forEach(review => {
    const div = document.createElement('div');
    div.className = 'review-item';
    div.innerHTML = `
      <p>${review.text} (${review.rating} sao)</p>
      <small>${review.user} - ${new Date(review.date).toLocaleDateString()}</small>
    `;
    reviewList.appendChild(div);
  });

  modal.classList.add('active');
}

function addToCartFromModal() {
  const productId = document.querySelector('.product-item.selected')?.dataset.id;
  if (!productId) return;
  cachedProducts = cachedProducts || JSON.parse(localStorage.getItem('productsData') || '[]');
  const product = cachedProducts.find(p => p.id === productId);
  const quantity = parseInt(document.getElementById('product-quantity').value) || 1;
  addToCart(product.game, product.name, quantity);
  closeModal('product-detail-modal');
}

function buyNow() {
  addToCartFromModal();
  window.location.href = 'cart.html';
}

// Thêm hàm để submit đánh giá (chỉ người dùng đã mua)
function submitReview(productId, rating, text) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.username) {
    showToast('Vui lòng đăng nhập để đánh giá!', 'error');
    openAuthModal();
    return;
  }
  const orders = user.orders || [];
  if (!orders.some(order => order.items.some(item => item.id === productId))) {
    showToast('Chỉ người đã mua sản phẩm mới được đánh giá!', 'error');
    return;
  }
  let ratings = JSON.parse(localStorage.getItem('productRatings') || '{}');
  ratings[productId] = ratings[productId] || { avg: 0, count: 0, reviews: [] };
  const totalRating = ratings[productId].count * ratings[productId].avg + rating;
  ratings[productId].count += 1;
  ratings[productId].avg = totalRating / ratings[productId].count;
  ratings[productId].reviews.push({
    user: user.username,
    rating,
    text,
    date: new Date().toISOString()
  });
  localStorage.setItem('productRatings', JSON.stringify(ratings));
  openProductModal(productId); // Tải lại modal để cập nhật
  showToast('Đánh giá đã được gửi!');
}

function submitReviewFromModal() {
  const productId = document.querySelector('.product-item.selected')?.dataset.id;
  if (!productId) return;
  const rating = parseInt(document.getElementById('review-rating').value) || 0;
  const text = document.getElementById('review-text').value.trim();
  if (rating < 1 || rating > 5 || !text) {
    showToast('Vui lòng nhập đánh giá (1-5 sao) và nhận xét!', 'error');
    return;
  }
  submitReview(productId, rating, text);
  document.getElementById('review-rating').value = '';
  document.getElementById('review-text').value = '';
}

// Cập nhật addToCart để theo dõi sản phẩm đã mua
function addToCart(game, name, quantity = 1) {
  cachedCart = cachedCart || JSON.parse(localStorage.getItem('cart') || '[]');
  const id = Date.now().toString();
  const product = cachedProducts.find(p => p.name === name && p.game === game);
  if (product) {
    cachedCart.push({
      id: product.id,
      game,
      name,
      image: product.image,
      selectedOption: 'default',
      quantity,
      options: [
        { value: 'default', label: 'Mặc định', price: product.price },
        { value: 'premium', label: 'Cao cấp', price: product.price * 2 }
      ]
    });
    localStorage.setItem('cart', JSON.stringify(cachedCart));
    showToast('Đã thêm vào giỏ hàng!');
  }
}

function loadNotifications() {
  const container = document.getElementById('notifications');
  if (!container) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  container.innerHTML = '';
  if (!user.notifications || user.notifications.length === 0) {
    container.innerHTML = '<p>Không có thông báo nào.</p>';
    return;
  }

  // Thêm nút "Xóa tất cả"
  const clearAllButton = document.createElement('div');
  clearAllButton.className = 'clear-all-notifications';
  clearAllButton.innerHTML = '<button class="neon-btn danger" onclick="deleteAllNotifications()">Xóa tất cả</button>';
  container.appendChild(clearAllButton);

  user.notifications.forEach((notification, index) => {
    const div = document.createElement('div');
    div.className = 'notification-item neon-card';
    div.innerHTML = `
      <div class="notification-content">
        <p>${notification.message}</p>
        <span class="notification-date">${notification.date}</span>
      </div>
      <button class="neon-btn danger" onclick="deleteNotification(${index})">Xóa</button>
    `;
    container.appendChild(div);
  });
}

function deleteNotification(index) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.notifications || index < 0 || index >= user.notifications.length) {
    showToast('Lỗi: Không tìm thấy thông báo để xóa!', 'error');
    return;
  }
  user.notifications.splice(index, 1);
  updateUserData(user);
  loadNotifications();
  showToast('Đã xóa thông báo!', 'success');
}

function deleteAllNotifications() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.notifications || user.notifications.length === 0) {
    showToast('Không có thông báo để xóa!', 'error');
    return;
  }
  if (!confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) {
    return;
  }
  user.notifications = [];
  updateUserData(user);
  loadNotifications();
  showToast('Đã xóa tất cả thông báo!', 'success');
}

function reloadCartOnPageShow() {
  if (window.location.pathname.includes('cart.html')) {
    loadCart();
  }
}

// Gọi khi trang được tải hoặc hiển thị lại
document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  loadGames();
  loadBanners();
  loadHotDeals();
  loadProducts();
  loadAccountDetails();
  loadCart();
  loadLanguage();
  handleUserContextMenu();
  if (window.location.pathname.includes('account.html')) {
    loadTransactions();
  }
});
window.addEventListener('pageshow', reloadCartOnPageShow);

function markNotificationAsRead(notificationId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  user.notifications = user.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
  updateUserData(user);
  loadNotifications();
}

function handleUserContextMenu() {
  const userContextMenu = document.getElementById('user-context-menu');
  if (userContextMenu) {
    userContextMenu.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', () => {
        if (item.textContent.includes('Thông tin tài khoản')) {
          window.location.href = 'account.html';
        } else if (item.textContent.includes('Đăng xuất')) {
          logout();
        }
        userContextMenu.classList.remove('active');
      });
    });
  }
}