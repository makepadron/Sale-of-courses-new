
"use strict";

const COURSES_URL = new URL("./courses.json", document.currentScript.src);
const TELEGRAM_USERNAME = "cli_intelligence";
const CART_STORAGE_KEY = "cli_intelligence_cart";

let courses = [];
let cart = loadCart();

const elements = {
  grid: document.getElementById("courseGrid"),
  search: document.getElementById("courseSearch"),
  sort: document.getElementById("courseSort"),
  empty: document.getElementById("catalogEmpty"),
  total: document.getElementById("courseTotal"),
  cartCount: document.getElementById("cartCount"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  openCart: document.getElementById("openCart"),
  closeCart: document.getElementById("closeCart"),
  checkout: document.getElementById("checkoutButton")
};

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function getCartCourses() {
  return cart
    .map(id => courses.find(course => course.id === id))
    .filter(Boolean);
}

function renderCourses() {
  const search = elements.search.value.trim().toLowerCase();
  const sort = elements.sort.value;

  let filtered = courses.filter(course => {
    const searchable = `${course.title} ${course.description}`.toLowerCase();
    return searchable.includes(search);
  });

  if (sort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  if (sort === "name") {
    filtered.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }

  elements.total.textContent = filtered.length;
  elements.empty.hidden = filtered.length !== 0;

  if (filtered.length === 0) {
    elements.grid.innerHTML = "";
    return;
  }

  elements.grid.innerHTML = filtered.map(course => {
    const isAdded = cart.includes(course.id);

    return `
      <article class="course-card">
        <div class="course-number">
          COURSE / ${String(course.id).padStart(2, "0")}
        </div>

        <h3>${escapeHTML(course.title)}</h3>

        <p>${escapeHTML(course.description)}</p>

        <div class="course-card-bottom">
          <div class="course-price">${formatPrice(course.price)}</div>

          <div class="course-actions">
            <a
              class="course-link"
              href="courses/${encodeURIComponent(course.slug)}.html"
            >
              Подробнее
            </a>

            <button
              class="add-to-cart"
              type="button"
              data-add-course="${course.id}"
            >
              ${isAdded ? "Добавлено" : "В корзину"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function addToCart(id) {
  if (!courses.some(course => course.id === id)) return;

  if (cart.includes(id)) {
    removeFromCart(id);
    return;
  }

  cart.push(id);
  saveCart();
  renderCourses();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(courseId => courseId !== id);
  saveCart();
  renderCourses();
  renderCart();
}

function renderCart() {
  const selected = getCartCourses();

  const total = selected.reduce((sum, course) => {
    return sum + course.price;
  }, 0);

  elements.cartCount.textContent = selected.length;
  elements.cartTotal.textContent = formatPrice(total);
  elements.checkout.disabled = selected.length === 0;

  if (selected.length === 0) {
    elements.cartItems.innerHTML = `
      <p class="cart-empty">Корзина пока пуста.</p>
    `;
    return;
  }

  elements.cartItems.innerHTML = selected.map(course => `
    <div class="cart-item">
      <div>
        <h4>${escapeHTML(course.title)}</h4>
        <span>${formatPrice(course.price)}</span>
      </div>

      <button
        class="remove-item"
        type="button"
        data-remove-course="${course.id}"
        aria-label="Удалить курс"
      >
        Удалить
      </button>
    </div>
  `).join("");
}

function openCart() {
  elements.cartOverlay.hidden = false;
  document.body.style.overflow = "hidden";
  elements.closeCart.focus();
}

function closeCart() {
  elements.cartOverlay.hidden = true;
  document.body.style.overflow = "";
  elements.openCart.focus();
}

function checkout() {
  const selected = getCartCourses();

  if (selected.length === 0) return;

  const total = selected.reduce((sum, course) => {
    return sum + course.price;
  }, 0);

  const lines = selected.map((course, index) => {
    return `${index + 1}. ${course.title} — ${formatPrice(course.price)}`;
  });

  const message = [
    "Здравствуйте! Хочу приобрести курсы CLI INTELLIGENCE.",
    "",
    ...lines,
    "",
    `Итого: ${formatPrice(total)}`,
    "",
    "Подскажите, пожалуйста, порядок оформления заказа."
  ].join("\n");

  const url = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

async function initialize() {
  try {
    const response = await fetch(COURSES_URL);

    if (!response.ok) {
      throw new Error(`Ошибка загрузки каталога: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Неверный формат каталога.");
    }

    courses = data.filter(course =>
      Number.isInteger(course.id) &&
      typeof course.title === "string" &&
      typeof course.description === "string" &&
      typeof course.slug === "string" &&
      Number.isFinite(course.price) &&
      Number.isFinite(course.usd)
    );

    cart = cart.filter(id => courses.some(course => course.id === id));
    saveCart();

    renderCourses();
    renderCart();

  } catch (error) {
    console.error(error);

    elements.grid.innerHTML = `
      <div class="loading-state">
        Не удалось загрузить каталог. Проверьте наличие файла
        assets/courses.json и правильность его содержимого.
      </div>
    `;
  }
}

elements.grid.addEventListener("click", event => {
  const button = event.target.closest("[data-add-course]");
  if (!button) return;

  addToCart(Number(button.dataset.addCourse));
});

elements.cartItems.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-course]");
  if (!button) return;

  removeFromCart(Number(button.dataset.removeCourse));
});

elements.search.addEventListener("input", renderCourses);
elements.sort.addEventListener("change", renderCourses);

elements.openCart.addEventListener("click", openCart);
elements.closeCart.addEventListener("click", closeCart);
elements.checkout.addEventListener("click", checkout);

elements.cartOverlay.addEventListener("click", event => {
  if (event.target === elements.cartOverlay) {
    closeCart();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !elements.cartOverlay.hidden) {
    closeCart();
  }
});

initialize();
