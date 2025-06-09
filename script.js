// script.js
class AtomalhosApp {
  constructor() {
    this.shortcuts = [];
    this.categories = new Set(["trabalho", "social", "entretenimento", "educacao", "noticias", "ferramentas"]);
    this.currentFilter = "all";
    this.searchTerm = "";
    
    this.initializeElements();
    this.initializeEventListeners();
    this.initializeAnimations();
    this.loadData();
    this.setupDragAndDrop();
  }

  initializeElements() {
    // Elementos do formulário
    this.form = document.getElementById("shortcut-form");
    this.nameInput = document.getElementById("shortcut-name");
    this.urlInput = document.getElementById("shortcut-url");
    this.categorySelect = document.getElementById("shortcut-category");
    this.newCategoryInput = document.getElementById("new-category");
    
    // Elementos de busca e filtros
    this.searchInput = document.getElementById("search-input");
    this.categoryFilter = document.getElementById("category-filter");
    this.showFavoritesBtn = document.getElementById("show-favorites");
    this.showAllBtn = document.getElementById("show-all");
    
    // Containers
    this.shortcutsContainer = document.getElementById("shortcuts");
    this.categoriesContainer = document.getElementById("categories-container");
    this.favoritesSection = document.getElementById("favorites-section");
    this.favoritesContainer = document.getElementById("favorites-shortcuts");
    
    // Loading overlay
    this.loadingOverlay = document.getElementById("loading-overlay");
    
    // Configurações
    this.settingsToggle = document.querySelector(".settings-toggle");
    this.settingsPanel = document.querySelector(".settings-panel");
    this.bgColorPicker = document.getElementById("bg-color-picker");
    this.buttonColorPicker = document.getElementById("button-color-picker");
    this.bgImageUpload = document.getElementById("bg-image-upload");
    this.removeBgBtn = document.getElementById("remove-bg");
    this.closeSettingsBtn = document.getElementById("close-settings");
  }

  initializeEventListeners() {
    // Formulário
    this.form.addEventListener("submit", (e) => this.handleFormSubmit(e));
    
    // Busca com debounce
    let searchTimeout;
    this.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
    });
    
    // Filtros
    this.categoryFilter.addEventListener("change", (e) => this.handleCategoryFilter(e.target.value));
    this.showFavoritesBtn.addEventListener("click", () => this.showFavorites());
    this.showAllBtn.addEventListener("click", () => this.showAll());
    
    // Configurações
    this.settingsToggle.addEventListener("click", () => this.toggleSettings());
    this.closeSettingsBtn.addEventListener("click", () => this.closeSettings());
    this.bgColorPicker.addEventListener("input", (e) => this.updateBgColor(e.target.value));
    this.buttonColorPicker.addEventListener("input", (e) => this.updateButtonColor(e.target.value));
    this.bgImageUpload.addEventListener("change", (e) => this.handleBgImageUpload(e));
    this.removeBgBtn.addEventListener("click", () => this.removeBgImage());
    
    // Fechar configurações ao clicar fora
    document.addEventListener("click", (e) => {
      if (!this.settingsPanel.contains(e.target) && !this.settingsToggle.contains(e.target)) {
        this.closeSettings();
      }
    });
  }

  initializeAnimations() {
    // Inicializar AOS
    if (typeof AOS !== "undefined") {
      AOS.init({
        duration: 600,
        easing: "ease-in-out",
        once: true,
        offset: 50
      });
    }
  }

  setupDragAndDrop() {
    // Configurar drag & drop para cada container de atalhos
    this.setupSortableContainer(this.shortcutsContainer);
    this.setupSortableContainer(this.favoritesContainer);
  }

  setupSortableContainer(container) {
    if (container) {
      new Sortable(container, {
        animation: 200,
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        onEnd: () => this.saveData()
      });
    }
  }

  showLoading() {
    this.loadingOverlay.classList.add("show");
  }

  hideLoading() {
    this.loadingOverlay.classList.remove("show");
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const name = this.nameInput.value.trim();
    const url = this.urlInput.value.trim();
    let category = this.categorySelect.value;
    const newCategory = this.newCategoryInput.value.trim();
    
    if (newCategory) {
      category = newCategory.toLowerCase();
      this.categories.add(category);
      this.updateCategoryOptions();
    }
    
    this.showLoading();
    
    try {
      await this.addShortcut(name, url, category);
      this.form.reset();
      
      // Mostrar feedback visual
      this.showNotification("Atalho adicionado com sucesso!", "success");
    } catch (error) {
      this.showNotification("Erro ao adicionar atalho", "error");
      console.error("Erro ao adicionar atalho:", error);
    } finally {
      this.hideLoading();
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === "success" ? "#28a745" : type === "error" ? "#dc3545" : "#007bff"};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  async addShortcut(name, url, category = "", isFavorite = false) {
    const shortcut = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      url,
      category,
      isFavorite,
      icon: await this.getWebsiteIcon(url),
      preview: await this.getWebsitePreview(url),
      createdAt: new Date().toISOString()
    };
    
    this.shortcuts.push(shortcut);
    this.renderShortcut(shortcut);
    this.saveData();
    this.updateCategoryOptions();
    this.updateShortcutsCount();
    
    // Refresh AOS para novos elementos
    if (typeof AOS !== "undefined") {
      AOS.refresh();
    }
  }

  async getWebsiteIcon(url) {
    try {
      const domain = new URL(url).hostname;
      
      // Tentar diferentes fontes de favicon
      const iconSources = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://${domain}/favicon.ico`
      ];
      
      for (const iconUrl of iconSources) {
        try {
          const response = await fetch(iconUrl);
          if (response.ok) {
            return iconUrl;
          }
        } catch {
          continue;
        }
      }
      
      return "fas fa-globe";
    } catch {
      return "fas fa-globe";
    }
  }

  async getWebsitePreview(url) {
    try {
      console.log(`Attempting to get favicon for: ${url}`);
      
      // Extrair o domínio da URL
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Múltiplas estratégias para obter o favicon
      const faviconSources = [
        // Google Favicon API (mais confiável)
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        // DuckDuckGo Favicon API
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        // Favicon padrão do site
        `${urlObj.protocol}//${domain}/favicon.ico`,
        // Favicon na raiz
        `${urlObj.protocol}//${domain}/favicon.png`,
        // Apple touch icon
        `${urlObj.protocol}//${domain}/apple-touch-icon.png`
      ];
      
      // Tentar carregar o favicon
      const faviconUrl = await this.tryLoadFavicon(faviconSources);
      
      const previewData = {
        title: domain,
        description: `Site: ${domain}`,
        image: faviconUrl,
        logo: faviconUrl
      };
      
      console.log("Favicon data extracted:", previewData);
      return previewData;
      
    } catch (error) {
      console.error("Error fetching favicon:", error);
      
      // Fallback: extrair informações básicas da URL
      try {
        const urlObj = new URL(url);
        return {
          title: urlObj.hostname,
          description: `Site: ${urlObj.hostname}`,
          image: null,
          logo: null
        };
      } catch (urlError) {
        console.error("Error parsing URL:", urlError);
        return null;
      }
    }
  }

  async tryLoadFavicon(faviconSources) {
    for (const faviconUrl of faviconSources) {
      try {
        console.log(`Trying favicon source: ${faviconUrl}`);
        
        // Criar uma imagem para testar se o favicon carrega
        const img = new Image();
        
        const loadPromise = new Promise((resolve, reject) => {
          img.onload = () => {
            console.log(`Favicon loaded successfully: ${faviconUrl}`);
            resolve(faviconUrl);
          };
          img.onerror = () => {
            console.log(`Favicon failed to load: ${faviconUrl}`);
            reject(new Error('Failed to load'));
          };
          
          // Timeout de 5 segundos
          setTimeout(() => {
            reject(new Error('Timeout'));
          }, 5000);
        });
        
        img.src = faviconUrl;
        
        // Se chegou até aqui, o favicon carregou com sucesso
        return await loadPromise;
        
      } catch (error) {
        console.log(`Failed to load favicon from: ${faviconUrl}`, error);
        continue; // Tentar próxima fonte
      }
    }
    
    // Se nenhum favicon foi encontrado, retornar null
    console.log("No favicon found from any source");
    return null;
  }

  renderShortcut(shortcut) {
    const container = shortcut.category ? 
      this.getOrCreateCategoryContainer(shortcut.category) : 
      this.shortcutsContainer;
    
    const div = document.createElement("div");
    div.className = `shortcut ${shortcut.isFavorite ? "favorite" : ""}`;
    div.dataset.id = shortcut.id;
    div.dataset.name = shortcut.name.toLowerCase();
    div.dataset.category = shortcut.category;
    div.setAttribute("data-aos", "fade-up");
    div.setAttribute("data-aos-delay", Math.random() * 200);
    
    const previewHtml = this.generatePreviewHtml(shortcut);
    
    div.innerHTML = `
      <a href="${shortcut.url}" target="_blank" rel="noopener noreferrer">
        ${previewHtml}
        <div class="shortcut-info">
          <div class="shortcut-name">${shortcut.name}</div>
          <div class="shortcut-url">${new URL(shortcut.url).hostname}</div>
        </div>
      </a>
      <div class="shortcut-actions">
        <button class="action-btn edit-btn" 
                onclick="app.editShortcut(\'${shortcut.id}\')" 
                title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn duplicate-btn" 
                onclick="app.duplicateShortcut(\'${shortcut.id}\')" 
                title="Duplicar">
          <i class="fas fa-copy"></i>
        </button>
        <button class="action-btn favorite-btn ${shortcut.isFavorite ? "active" : ""}" 
                onclick="app.toggleFavorite(\'${shortcut.id}\')" 
                title="Favoritar">
          <i class="fas fa-star"></i>
        </button>
        <button class="action-btn delete-btn" 
                onclick="app.deleteShortcut(\'${shortcut.id}\')" 
                title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    container.appendChild(div);
    
    // Adicionar animação de entrada
    setTimeout(() => {
      div.classList.add("aos-animate");
    }, 100);
  }

  generatePreviewHtml(shortcut) {
    if (shortcut.preview?.image) {
      return `<div class="shortcut-preview" style="background-image: url(\'${shortcut.preview.image}\')"></div>`;
    } else if (shortcut.icon && !shortcut.icon.startsWith("fa")) {
      return `<div class="shortcut-preview"><img src="${shortcut.icon}" alt="Ícone" style="width: 32px; height: 32px; object-fit: contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';"><i class="fas fa-globe" style="display: none;"></i></div>`;
    } else {
      return `<div class="shortcut-preview"><i class="${shortcut.icon || "fas fa-globe"}"></i></div>`;
    }
  }

  getOrCreateCategoryContainer(category) {
    let categorySection = document.getElementById(`category-${category}`);
    
    if (!categorySection) {
      categorySection = document.createElement("div");
      categorySection.className = "category-section";
      categorySection.id = `category-${category}`;
      categorySection.setAttribute("data-aos", "fade-up");
      
      categorySection.innerHTML = `
        <h2 class="category-title">
          <span class="category-info">
            <i class="fas fa-folder"></i> ${this.formatCategoryName(category)}
          </span>
          <div class="category-actions">
            <button class="category-action-btn delete-category-btn" 
                    onclick="app.deleteCategory(\'${category}\')" 
                    title="Excluir categoria">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </h2>
        <div class="shortcuts-grid" id="shortcuts-${category}"></div>
      `;
      
      this.categoriesContainer.appendChild(categorySection);
      this.setupSortableContainer(categorySection.querySelector(".shortcuts-grid"));
    }
    
    return categorySection.querySelector(".shortcuts-grid");
  }

  formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  deleteCategory(category) {
    const categoryShortcuts = this.shortcuts.filter(s => s.category === category);
    const shortcutCount = categoryShortcuts.length;
    
    let confirmMessage = `Tem certeza que deseja excluir a categoria "${this.formatCategoryName(category)}"?`;
    if (shortcutCount > 0) {
      confirmMessage += `\n\nEsta ação irá excluir ${shortcutCount} atalho(s) que estão nesta categoria.`;
    }
    
    if (confirm(confirmMessage)) {
      // Remover todos os atalhos da categoria
      this.shortcuts = this.shortcuts.filter(s => s.category !== category);
      
      // Remover a categoria do conjunto de categorias
      this.categories.delete(category);
      
      // Remover a seção da categoria do DOM
      const categorySection = document.getElementById(`category-${category}`);
      if (categorySection) {
        categorySection.remove();
      }
      
      // Atualizar as opções de categoria
      this.updateCategoryOptions();
      
      // Salvar dados
      this.saveData();
      
      // Atualizar contagem
      this.updateShortcutsCount();
      
      // Mostrar notificação
      const message = shortcutCount > 0 ? 
        `Categoria "${this.formatCategoryName(category)}" e ${shortcutCount} atalho(s) excluídos!` :
        `Categoria "${this.formatCategoryName(category)}" excluída!`;
      this.showNotification(message, "success");
    }
  }

  toggleFavorite(id) {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      shortcut.isFavorite = !shortcut.isFavorite;
      this.renderAllShortcuts();
      this.saveData();
      
      const message = shortcut.isFavorite ? "Adicionado aos favoritos!" : "Removido dos favoritos!";
      this.showNotification(message, "success");
    }
  }

  deleteShortcut(id) {
    if (confirm("Tem certeza que deseja excluir este atalho?")) {
      this.shortcuts = this.shortcuts.filter(s => s.id !== id);
      this.renderAllShortcuts();
      this.saveData();
      this.updateShortcutsCount();
      this.showNotification("Atalho excluído com sucesso!", "success");
    }
  }

  duplicateShortcut(id) {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      const duplicatedShortcut = {
        ...shortcut,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: `${shortcut.name} (Cópia)`,
        createdAt: new Date().toISOString()
      };
      
      this.shortcuts.push(duplicatedShortcut);
      this.renderShortcut(duplicatedShortcut);
      this.saveData();
      this.updateShortcutsCount();
      this.showNotification("Atalho duplicado com sucesso!", "success");
      
      // Refresh AOS para novos elementos
      if (typeof AOS !== "undefined") {
        AOS.refresh();
      }
    }
  }

  editShortcut(id) {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (!shortcut) return;
    
    // Criar modal de edição
    this.showEditModal(shortcut);
  }

  showEditModal(shortcut) {
    // Remover modal existente se houver
    const existingModal = document.getElementById("edit-modal");
    if (existingModal) {
      existingModal.remove();
    }
    
    // Criar modal
    const modal = document.createElement("div");
    modal.id = "edit-modal";
    modal.className = "modal-overlay";
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Editar Atalho</h2>
          <button class="close-modal-btn" onclick="app.closeEditModal()">&times;</button>
        </div>
        <form id="edit-shortcut-form">
          <div class="form-field">
            <label for="edit-shortcut-name">Nome do Atalho</label>
            <input type="text" id="edit-shortcut-name" value="${shortcut.name}" required />
          </div>
          <div class="form-field">
            <label for="edit-shortcut-url">URL</label>
            <input type="url" id="edit-shortcut-url" value="${shortcut.url}" required />
          </div>
          <div class="form-field">
            <label for="edit-shortcut-category">Categoria</label>
            <select id="edit-shortcut-category">
              <!-- Opções de categoria serão preenchidas aqui -->
            </select>
          </div>
          <div class="form-field">
            <label for="edit-new-category">Nova categoria (opcional)</label>
            <input type="text" id="edit-new-category" placeholder="Digite uma nova categoria" />
          </div>
          <button type="submit" class="create-btn">Salvar Alterações</button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Preencher categorias e selecionar a atual
    const editCategorySelect = document.getElementById("edit-shortcut-category");
    this.categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = this.formatCategoryName(cat);
      editCategorySelect.appendChild(option);
    });
    editCategorySelect.value = shortcut.category;

    // Adicionar listener para o formulário de edição
    document.getElementById("edit-shortcut-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const newName = document.getElementById("edit-shortcut-name").value.trim();
      const newUrl = document.getElementById("edit-shortcut-url").value.trim();
      let newCategory = document.getElementById("edit-shortcut-category").value;
      const newNewCategory = document.getElementById("edit-new-category").value.trim();

      if (newNewCategory) {
        newCategory = newNewCategory.toLowerCase();
        this.categories.add(newCategory);
        this.updateCategoryOptions();
      }

      this.updateShortcut(shortcut.id, newName, newUrl, newCategory);
      this.closeEditModal();
      this.showNotification("Atalho atualizado com sucesso!", "success");
    });

    // Fechar modal ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeEditModal();
      }
    });
  }

  closeEditModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) {
      modal.remove();
    }
  }

  updateShortcut(id, newName, newUrl, newCategory) {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      shortcut.name = newName;
      shortcut.url = newUrl;
      shortcut.category = newCategory;
      this.saveData();
      this.renderAllShortcuts();
    }
  }

  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.renderAllShortcuts();
  }

  handleCategoryFilter(category) {
    this.currentFilter = category;
    this.renderAllShortcuts();
    
    // Atualizar estado dos botões de filtro
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    if (category === "favorites") {
      this.showFavoritesBtn.classList.add("active");
    } else if (category === "all") {
      this.showAllBtn.classList.add("active");
    }
  }

  showFavorites() {
    this.currentFilter = "favorites";
    this.renderAllShortcuts();
    
    // Atualizar estado dos botões de filtro
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    this.showFavoritesBtn.classList.add("active");
  }

  showAll() {
    this.currentFilter = "all";
    this.renderAllShortcuts();
    
    // Atualizar estado dos botões de filtro
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    this.showAllBtn.classList.add("active");
  }

  renderAllShortcuts() {
    // Limpar containers
    this.shortcutsContainer.innerHTML = "";
    this.favoritesContainer.innerHTML = "";
    document.querySelectorAll(".category-section:not(#favorites-section):not(#uncategorized-section)").forEach(el => el.remove());
    
    // Esconder/mostrar seção de favoritos
    this.favoritesSection.style.display = this.currentFilter === "favorites" ? "block" : "none";

    let filteredShortcuts = this.shortcuts.filter(shortcut => {
      const matchesSearch = shortcut.name.toLowerCase().includes(this.searchTerm) || 
                            shortcut.url.toLowerCase().includes(this.searchTerm);
      
      const matchesCategory = this.currentFilter === "all" || 
                              (this.currentFilter === "favorites" && shortcut.isFavorite) ||
                              (this.currentFilter !== "favorites" && shortcut.category === this.currentFilter);
      
      return matchesSearch && matchesCategory;
    });

    if (filteredShortcuts.length === 0 && this.searchTerm === "" && this.currentFilter === "all") {
      document.getElementById("empty-state").style.display = "block";
    } else {
      document.getElementById("empty-state").style.display = "none";
    }

    // Renderizar atalhos
    filteredShortcuts.forEach(shortcut => {
      if (this.currentFilter === "favorites" && !shortcut.isFavorite) {
        return; // Não renderizar não-favoritos na visão de favoritos
      }
      this.renderShortcut(shortcut);
    });

    this.updateShortcutsCount();
  }

  updateShortcutsCount() {
    const count = this.shortcuts.length;
    document.getElementById("shortcuts-count").textContent = `${count} atalho(s)`;
  }

  updateCategoryOptions() {
    this.categorySelect.innerHTML = 
      `<option value="">Selecionar categoria</option>
       <option value="all">Todas as categorias</option>`;
    this.categoryFilter.innerHTML = 
      `<option value="all">Todas as categorias</option>`;

    this.categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = this.formatCategoryName(category);
      this.categorySelect.appendChild(option);

      const filterOption = document.createElement("option");
      filterOption.value = category;
      filterOption.textContent = this.formatCategoryName(category);
      this.categoryFilter.appendChild(filterOption);
    });

    // Restaurar a seleção atual
    this.categoryFilter.value = this.currentFilter;
  }

  saveData() {
    localStorage.setItem("atomalhosShortcuts", JSON.stringify(this.shortcuts));
    localStorage.setItem("atomalhosCategories", JSON.stringify(Array.from(this.categories)));
    localStorage.setItem("atomalhosBgColor", document.body.style.getPropertyValue("--bg-color"));
    localStorage.setItem("atomalhosButtonColor", document.body.style.getPropertyValue("--button-color"));
    localStorage.setItem("atomalhosBgImage", localStorage.getItem("atomalhosBgImage")); // Salva a URL da imagem de fundo
  }

  loadData() {
    const storedShortcuts = localStorage.getItem("atomalhosShortcuts");
    const storedCategories = localStorage.getItem("atomalhosCategories");
    const storedBgColor = localStorage.getItem("atomalhosBgColor");
    const storedButtonColor = localStorage.getItem("atomalhosButtonColor");
    const storedBgImage = localStorage.getItem("atomalhosBgImage");

    if (storedShortcuts) {
      this.shortcuts = JSON.parse(storedShortcuts);
    }
    if (storedCategories) {
      this.categories = new Set(JSON.parse(storedCategories));
    }
    if (storedBgColor) {
      this.updateBgColor(storedBgColor);
    }
    if (storedButtonColor) {
      this.updateButtonColor(storedButtonColor);
    }
    if (storedBgImage) {
      this.applyBgImage(storedBgImage);
    }

    this.renderAllShortcuts();
    this.updateCategoryOptions();
    this.updateShortcutsCount();
  }

  // Funções de configurações
  toggleSettings() {
    this.settingsPanel.classList.toggle("hidden");
  }

  closeSettings() {
    this.settingsPanel.classList.add("hidden");
  }

  updateBgColor(color) {
    document.body.style.setProperty("--bg-color", color);
    this.saveData();
  }

  updateButtonColor(color) {
    document.body.style.setProperty("--button-color", color);
    this.saveData();
  }

  handleBgImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        this.applyBgImage(imageUrl);
        localStorage.setItem("atomalhosBgImage", imageUrl);
        this.showNotification("Imagem de fundo aplicada!", "success");
      };
      reader.readAsDataURL(file);
    }
  }

  applyBgImage(imageUrl) {
    document.body.style.backgroundImage = `url("${imageUrl}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
  }

  removeBgImage() {
    document.body.style.backgroundImage = "none";
    localStorage.removeItem("atomalhosBgImage");
    this.showNotification("Imagem de fundo removida!", "success");
    this.saveData();
  }
}

const app = new AtomalhosApp();


