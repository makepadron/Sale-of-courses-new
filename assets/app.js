
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
    const saved = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY)
    );

    return Array.isArray(saved)
      ? [...new Set(saved.filter(id =>
          Number.isInteger(id) && id > 0
        ))]
      : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(cart)
    );
  } catch (error) {
    console.error("Не удалось сохранить корзину:", error);
  }
}

function syncCartFromStorage() {
  cart = loadCart();

  if (courses.length > 0) {
    cart = cart.filter(id =>
      courses.some(course => course.id === id)
    );
    saveCart();
  }

  renderCourses();
  renderCart();
}

function getCartCourses() {
  return cart
    .map(id => courses.find(course => course.id === id))
    .filter(Boolean);
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

function renderCourses() {
  if (!elements.grid) return;

  const search = elements.search
    ? elements.search.value.trim().toLowerCase()
    : "";

  const sort = elements.sort
    ? elements.sort.value
    : "default";

  let filtered = courses.filter(course => {
    const searchable =
      `${course.title} ${course.description}`.toLowerCase();

    return searchable.includes(search);
  });

  if (sort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  if (sort === "name") {
    filtered.sort((a, b) =>
      a.title.localeCompare(b.title, "ru")
    );
  }

  if (elements.total) {
    elements.total.textContent = filtered.length;
  }

  if (elements.empty) {
    elements.empty.hidden = filtered.length !== 0;
  }

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
          <div class="course-price">
            ${formatPrice(course.price)}
          </div>

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

  if (elements.cartCount) {
    elements.cartCount.textContent = selected.length;
  }

  if (elements.cartTotal) {
    elements.cartTotal.textContent = formatPrice(total);
  }

  if (elements.checkout) {
    elements.checkout.disabled = selected.length === 0;
  }

  if (!elements.cartItems) return;

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
  if (!elements.cartOverlay) return;

  elements.cartOverlay.hidden = false;
  document.body.style.overflow = "hidden";

  if (elements.closeCart) {
    elements.closeCart.focus();
  }
}

function closeCart() {
  if (!elements.cartOverlay) return;

  elements.cartOverlay.hidden = true;
  document.body.style.overflow = "";

  if (elements.openCart) {
    elements.openCart.focus();
  }
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

  const url =
    `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

async function initialize() {
  try {
    const response = await fetch(COURSES_URL);

    if (!response.ok) {
      throw new Error(
        `Ошибка загрузки каталога: ${response.status}`
      );
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

    cart = cart.filter(id =>
      courses.some(course => course.id === id)
    );

    saveCart();

    renderCourses();
    renderCart();

  } catch (error) {
    console.error(error);

    if (elements.grid) {
      elements.grid.innerHTML = `
        <div class="loading-state">
          Не удалось загрузить каталог. Проверьте наличие файла
          assets/courses.json и правильность его содержимого.
        </div>
      `;
    }
  }
}

/* Добавление курса из каталога */

if (elements.grid) {
  elements.grid.addEventListener("click", event => {
    const button = event.target.closest("[data-add-course]");

    if (!button) return;

    addToCart(Number(button.dataset.addCourse));
  });
}

/* Удаление курса из корзины */

if (elements.cartItems) {
  elements.cartItems.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-course]");

    if (!button) return;

    removeFromCart(Number(button.dataset.removeCourse));
  });
}

/* Синхронизация после нажатия кнопки на странице курса */

document.addEventListener("click", event => {
  const button = event.target.closest("#detailAddToCart");

  if (!button) return;

  queueMicrotask(() => {
    syncCartFromStorage();
  });
});

/* Синхронизация между вкладками */

window.addEventListener("storage", event => {
  if (event.key === CART_STORAGE_KEY) {
    syncCartFromStorage();
  }
});

/* Поиск и сортировка */

if (elements.search) {
  elements.search.addEventListener("input", renderCourses);
}

if (elements.sort) {
  elements.sort.addEventListener("change", renderCourses);
}

/* Управление корзиной */

if (elements.openCart) {
  elements.openCart.addEventListener("click", openCart);
}

if (elements.closeCart) {
  elements.closeCart.addEventListener("click", closeCart);
}

if (elements.checkout) {
  elements.checkout.addEventListener("click", checkout);
}

if (elements.cartOverlay) {
  elements.cartOverlay.addEventListener("click", event => {
    if (event.target === elements.cartOverlay) {
      closeCart();
    }
  });
}

/* Закрытие корзины клавишей Escape */

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    elements.cartOverlay &&
    !elements.cartOverlay.hidden
  ) {
    closeCart();
  }
});

/* Запуск сайта */

initialize();
