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
    // Verificar se os elementos existem antes de adicionar listeners
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleFormSubmit(e));
    }
    
    if (this.searchInput) {
      let searchTimeout;
      this.searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
      });
    }
    
    if (this.categoryFilter) {
      this.categoryFilter.addEventListener("change", (e) => this.handleCategoryFilter(e.target.value));
    }
    
    if (this.showFavoritesBtn) {
      this.showFavoritesBtn.addEventListener("click", () => this.showFavorites());
    }
    
    if (this.showAllBtn) {
      this.showAllBtn.addEventListener("click", () => this.showAll());
    }
    
    if (this.settingsToggle) {
      this.settingsToggle.addEventListener("click", () => this.toggleSettings());
    }
    
    if (this.closeSettingsBtn) {
      this.closeSettingsBtn.addEventListener("click", () => this.closeSettings());
    }
    
    if (this.bgColorPicker) {
      this.bgColorPicker.addEventListener("input", (e) => this.updateBgColor(e.target.value));
    }
    
    if (this.buttonColorPicker) {
      this.buttonColorPicker.addEventListener("input", (e) => this.updateButtonColor(e.target.value));
    }
    
    if (this.bgImageUpload) {
      this.bgImageUpload.addEventListener("change", (e) => this.handleBgImageUpload(e));
    }
    
    if (this.removeBgBtn) {
      this.removeBgBtn.addEventListener("click", () => this.removeBgImage());
    }
    
    // Fechar configurações ao clicar fora
    if (this.settingsPanel && this.settingsToggle) {
      document.addEventListener("click", (e) => {
        if (!this.settingsPanel.contains(e.target) && !this.settingsToggle.contains(e.target)) {
          this.closeSettings();
        }
      });
    }
  }

  initializeAnimations() {
    // Inicializar AOS se disponível
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
    if (typeof Sortable !== "undefined") {
      this.setupSortableContainer(this.shortcutsContainer);
      this.setupSortableContainer(this.favoritesContainer);
    }
  }

  setupSortableContainer(container) {
    if (container && typeof Sortable !== "undefined") {
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
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add("show");
    }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove("show");
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const name = this.nameInput.value.trim();
    const url = this.urlInput.value.trim();
    let category = this.categorySelect.value;
    const newCategory = this.newCategoryInput.value.trim();
    
    // Verificar se há campos de cor (podem não existir no HTML)
    const shortcutColorElement = document.getElementById("shortcut-color");
    const categoryColorElement = document.getElementById("category-color");
    const shortcutColor = shortcutColorElement ? shortcutColorElement.value : "#007bff";
    const categoryColor = categoryColorElement ? categoryColorElement.value : "#6c757d";
    
    if (!name || !url) {
      this.showNotification("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }
    
    if (newCategory) {
      category = newCategory.toLowerCase();
      this.categories.add(category);
      this.updateCategoryOptions();
      
      // Salvar cor da nova categoria se o elemento existir
      if (categoryColorElement) {
        this.saveCategoryColor(category, categoryColor);
      }
    }
    
    this.showLoading();
    
    try {
      await this.addShortcut(name, url, category, false, shortcutColor);
      this.form.reset();
      
      // Resetar cores para valores padrão se os elementos existirem
      if (shortcutColorElement) shortcutColorElement.value = "#007bff";
      if (categoryColorElement) categoryColorElement.value = "#6c757d";
      
      this.showNotification("Atalho adicionado com sucesso!", "success");
      this.updateShortcutsCount();
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

  async getWebsiteIcon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  }

  async addShortcut(name, url, category = "", isFavorite = false, color = "#007bff") {
    // Normalizar URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const iconUrl = await this.getWebsiteIcon(url);
    const shortcut = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      url,
      category,
      isFavorite,
      icon: iconUrl,
      color: color,
      createdAt: new Date().toISOString()
    };
    
    this.shortcuts.push(shortcut);
    this.renderShortcut(shortcut);
    this.saveData();
    this.updateCategoryOptions();
  }

  renderShortcut(shortcut) {
    const container = shortcut.category ? 
      this.getOrCreateCategoryContainer(shortcut.category) : 
      this.shortcutsContainer;
    
    if (!container) return;
    
    const div = document.createElement("div");
    div.className = `shortcut ${shortcut.isFavorite ? "favorite" : ""}`;
    div.dataset.id = shortcut.id;
    div.dataset.name = shortcut.name.toLowerCase();
    div.dataset.category = shortcut.category;
    div.setAttribute("data-aos", "fade-up");
    div.setAttribute("data-aos-delay", Math.random() * 200);
    
    // Aplicar cor personalizada
    if (shortcut.color) {
      div.style.background = shortcut.color;
    }
    
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
                onclick="app.editShortcut('${shortcut.id}')" 
                title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn duplicate-btn" 
                onclick="app.duplicateShortcut('${shortcut.id}')" 
                title="Duplicar">
          <i class="fas fa-copy"></i>
        </button>
        <button class="action-btn favorite-btn ${shortcut.isFavorite ? "active" : ""}" 
                onclick="app.toggleFavorite('${shortcut.id}')" 
                title="Favoritar">
          <i class="fas fa-star"></i>
        </button>
        <button class="action-btn delete-btn" 
                onclick="app.deleteShortcut('${shortcut.id}')" 
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
    if (shortcut.icon) {
      return `
        <div class="shortcut-preview">
          <img
            src="${shortcut.icon}"
            alt="Ícone de ${shortcut.name}"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="fallback-icon" style="display: none;">
            <i class="fas fa-globe"></i>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="shortcut-preview">
          <div class="fallback-icon">
            <i class="fas fa-globe"></i>
          </div>
        </div>
      `;
    }
  }

  getOrCreateCategoryContainer(category) {
    if (!this.categoriesContainer) return this.shortcutsContainer;
    
    let categorySection = document.getElementById(`category-${category}`);
    
    if (!categorySection) {
      categorySection = document.createElement("div");
      categorySection.className = "category-section";
      categorySection.id = `category-${category}`;
      categorySection.setAttribute("data-aos", "fade-up");
      
      // Obter cor da categoria
      const categoryColor = this.getCategoryColor(category);
      
      categorySection.innerHTML = `
        <h2 class="category-title" style="border-bottom-color: ${categoryColor};">
          <span class="category-info">
            <i class="fas fa-folder" style="color: ${categoryColor};"></i> ${this.formatCategoryName(category)}
          </span>
          <div class="category-actions">
            <button class="category-action-btn edit-category-btn" 
                    onclick="app.editCategoryColor('${category}')" 
                    title="Editar cor da categoria">
              <i class="fas fa-palette"></i>
            </button>
            <button class="category-action-btn delete-category-btn" 
                    onclick="app.deleteCategory('${category}')" 
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

  getCategoryColor(category) {
    // Cores padrão para categorias
    const defaultColors = {
      'trabalho': '#007bff',
      'social': '#28a745',
      'entretenimento': '#dc3545',
      'educacao': '#ffc107',
      'noticias': '#17a2b8',
      'ferramentas': '#6f42c1'
    };
    
    // Tentar obter cor salva ou usar cor padrão
    const savedColor = localStorage.getItem(`atomlhos-category-color-${category}`);
    return savedColor || defaultColors[category] || '#6c757d';
  }

  saveCategoryColorToStorage(category, color) {
    localStorage.setItem(`atomlhos-category-color-${category}`, color);
  }

  saveCategoryColor(category) {
    const colorInput = document.querySelector('#edit-category-color');
    if (!colorInput) return;
    
    const newColor = colorInput.value;
    
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      this.saveCategoryColorToStorage(category, newColor);
      this.renderAllShortcuts();
      this.showNotification(`Cor da categoria "${this.formatCategoryName(category)}" atualizada!`, "success");
      this.closeEditCategoryModal();
    } else {
      this.showNotification("Cor inválida! Use o formato #RRGGBB", "error");
    }
  }

  editCategoryColor(category) {
    const currentColor = this.getCategoryColor(category);
    
    // Criar modal de edição
    const modal = document.createElement("div");
    modal.id = "edit-category-modal";
    modal.className = "modal-overlay";
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Editar Cor da Categoria</h2>
          <button class="close-modal-btn" onclick="app.closeEditCategoryModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="edit-category-color">Cor para "${this.formatCategoryName(category)}"</label>
            <input type="color" id="edit-category-color" value="${currentColor}" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="app.closeEditCategoryModal()">Cancelar</button>
          <button class="btn-primary" onclick="app.saveCategoryColor('${category}')">Salvar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focar no input de cor
    modal.querySelector('#edit-category-color').focus();
  }
  closeEditCategoryModal() {
    const modal = document.getElementById("edit-category-modal");
    if (modal) {
      modal.remove();
    }
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
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut && confirm(`Tem certeza que deseja excluir o atalho "${shortcut.name}"?`)) {
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
              <option value="">Selecionar categoria</option>
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
    
    // Preencher opções de categoria
    const categorySelect = modal.querySelector('#edit-shortcut-category');
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = this.formatCategoryName(category);
      option.selected = category === shortcut.category;
      categorySelect.appendChild(option);
    });
    
    // Adicionar evento de submit
    const form = modal.querySelector('#edit-shortcut-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditedShortcut(shortcut.id, modal);
    });
    
    // Focar no primeiro campo
    modal.querySelector('#edit-shortcut-name').focus();
  }

  async saveEditedShortcut(id, modal) {
    const name = modal.querySelector('#edit-shortcut-name').value.trim();
    const url = modal.querySelector('#edit-shortcut-url').value.trim();
    let category = modal.querySelector('#edit-shortcut-category').value;
    const newCategory = modal.querySelector('#edit-new-category').value.trim();
    
    if (!name || !url) {
      this.showNotification('Por favor, preencha todos os campos.', 'error');
      return;
    }
    
    if (newCategory) {
      category = newCategory.toLowerCase();
      this.categories.add(category);
    }
    
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      // Normalizar URL
      let normalizedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        normalizedUrl = 'https://' + url;
      }
      
      const urlChanged = shortcut.url !== normalizedUrl;
      
      // Atualizar dados básicos
      shortcut.name = name;
      shortcut.url = normalizedUrl;
      shortcut.category = category;
      
      // Se a URL mudou, buscar novo ícone
      if (urlChanged) {
        shortcut.icon = await this.getWebsiteIcon(normalizedUrl);
      }
      
      this.saveData();
      this.updateCategoryOptions();
      this.renderAllShortcuts();
      this.updateShortcutsCount();
      this.showNotification('Atalho atualizado com sucesso!', 'success');
    }
    
    // Fechar modal
    this.closeEditModal();
  }

  closeEditModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) {
      modal.remove();
    }
  }

  handleSearch(searchTerm) {
    this.searchTerm = searchTerm.toLowerCase();
    this.applyFilters();
  }

  handleCategoryFilter(category) {
    this.currentFilter = category;
    this.applyFilters();
  }

  showFavorites() {
    this.currentFilter = 'favorites';
    if (this.showFavoritesBtn) this.showFavoritesBtn.classList.add('active');
    if (this.showAllBtn) this.showAllBtn.classList.remove('active');
    this.applyFilters();
  }

  showAll() {
    this.currentFilter = 'all';
    if (this.showAllBtn) this.showAllBtn.classList.add('active');
    if (this.showFavoritesBtn) this.showFavoritesBtn.classList.remove('active');
    this.applyFilters();
  }

  applyFilters() {
    const shortcuts = document.querySelectorAll('.shortcut');
    
    shortcuts.forEach(shortcutElement => {
      const name = shortcutElement.dataset.name || '';
      const category = shortcutElement.dataset.category || '';
      const isFavorite = shortcutElement.classList.contains('favorite');
      
      let show = true;
      
      // Filtro de busca
      if (this.searchTerm && !name.includes(this.searchTerm)) {
        show = false;
      }
      
      // Filtro de categoria
      if (this.currentFilter === 'favorites' && !isFavorite) {
        show = false;
      } else if (this.currentFilter !== 'all' && this.currentFilter !== 'favorites' && category !== this.currentFilter) {
        show = false;
      }
      
      shortcutElement.style.display = show ? 'block' : 'none';
    });
    
    // Mostrar/ocultar seções de categoria vazias
    const categorySections = document.querySelectorAll('.category-section');
    categorySections.forEach(section => {
      const visibleShortcuts = section.querySelectorAll('.shortcut[style*="block"], .shortcut:not([style])');
      section.style.display = visibleShortcuts.length > 0 ? 'block' : 'none';
    });
  }

  renderAllShortcuts() {
    // Limpar containers
    if (this.shortcutsContainer) this.shortcutsContainer.innerHTML = '';
    if (this.categoriesContainer) this.categoriesContainer.innerHTML = '';
    
    // Renderizar todos os atalhos
    this.shortcuts.forEach(shortcut => {
      this.renderShortcut(shortcut);
    });
    
    // Aplicar filtros atuais
    this.applyFilters();
    
    // Refresh AOS
    if (typeof AOS !== "undefined") {
      AOS.refresh();
    }
  }

  setTheme(theme) {
    // Remover classes existentes
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    
    if (theme === 'auto') {
      localStorage.removeItem('atomlhos-theme-preference');
      this.updateThemeBasedOnBackground();
    } else {
      document.documentElement.classList.add(theme + '-theme');
      localStorage.setItem('atomlhos-theme-preference', theme);
    }
  }

  updateCategoryOptions() {
    // Atualizar select de categoria no formulário
    if (this.categorySelect) {
      const currentValue = this.categorySelect.value;
      
      // Limpar opções existentes (exceto a primeira)
      while (this.categorySelect.children.length > 1) {
        this.categorySelect.removeChild(this.categorySelect.lastChild);
      }
      
      // Adicionar categorias
      this.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = this.formatCategoryName(category);
        this.categorySelect.appendChild(option);
      });
      
      // Restaurar valor selecionado
      this.categorySelect.value = currentValue;
    }
    
    // Atualizar filtro de categoria
    if (this.categoryFilter) {
      const currentFilterValue = this.categoryFilter.value;
      
      // Limpar opções existentes (exceto a primeira)
      while (this.categoryFilter.children.length > 1) {
        this.categoryFilter.removeChild(this.categoryFilter.lastChild);
      }
      
      // Adicionar categorias
      this.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = this.formatCategoryName(category);
        this.categoryFilter.appendChild(option);
      });
      
      // Restaurar valor selecionado
      this.categoryFilter.value = currentFilterValue;
    }
  }

  updateShortcutsCount() {
    const countElement = document.querySelector('.shortcuts-count');
    if (countElement) {
      const count = this.shortcuts.length;
      countElement.textContent = `${count} atalho${count !== 1 ? 's' : ''}`;
    }
  }

  // Configurações de tema
  toggleSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.classList.toggle('hidden');
    }
  }

  closeSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.classList.add('hidden');
    }
  }

  updateBgColor(color) {
    document.documentElement.style.setProperty('--bg-color', color);
    localStorage.setItem('atomlhos-bg-color', color);
  }

  updateButtonColor(color) {
    document.documentElement.style.setProperty('--button-color', color);
    localStorage.setItem('atomlhos-button-color', color);
  }

  handleBgImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showNotification('Imagem muito grande. Máximo 5MB.', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.body.style.backgroundImage = `url(${imageUrl})`;
        localStorage.setItem('atomlhos-bg-image', imageUrl);
        this.updateThemeBasedOnBackground();
        this.showNotification('Imagem de fundo alterada!', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  removeBgImage() {
    if (confirm('Tem certeza que deseja remover a imagem de fundo?')) {
      document.body.style.backgroundImage = '';
      localStorage.removeItem('atomlhos-bg-image');
      this.updateThemeBasedOnBackground();
      this.showNotification('Imagem de fundo removida!', 'success');
    }
  }

  // Salvar e carregar dados
  saveData() {
    try {
      localStorage.setItem('atomlhos-shortcuts', JSON.stringify(this.shortcuts));
      localStorage.setItem('atomlhos-categories', JSON.stringify([...this.categories]));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      this.showNotification('Erro ao salvar dados.', 'error');
    }
  }

  updateThemeBasedOnBackground() {
    // Verifica se o fundo é claro
    const bgColor = getComputedStyle(document.body).backgroundColor;
    const rgb = bgColor.match(/\d+/g);
    if (rgb) {
      // Fórmula para calcular brilho
      const brightness = (parseInt(rgb[0]) * 299 + 
                        (parseInt(rgb[1]) * 587) + 
                        (parseInt(rgb[2]) * 114)) / 1000;
      const isLight = brightness > 128;
      
      document.documentElement.classList.toggle('light-theme', isLight);
      localStorage.setItem('atomlhos-theme-preference', isLight ? 'light' : 'dark');
    }
  }
  
  loadData() {
    try {
      // Carregar atalhos
      const savedShortcuts = localStorage.getItem('atomlhos-shortcuts');
      if (savedShortcuts) { 
        this.shortcuts = JSON.parse(savedShortcuts);
        this.shortcuts.forEach(shortcut => {
          // Garantir que atalhos antigos tenham uma cor padrão
          if (!shortcut.color) {
            shortcut.color = '#007bff';
          }
          this.renderShortcut(shortcut);
        });
      }
      
      // Carregar categorias
      const savedCategories = localStorage.getItem('atomlhos-categories');
      if (savedCategories) {
        this.categories = new Set(JSON.parse(savedCategories));
      }
      
      // Carregar configurações de tema
      const savedBgColor = localStorage.getItem('atomlhos-bg-color');
      if (savedBgColor && this.bgColorPicker) {
        document.documentElement.style.setProperty('--bg-color', savedBgColor);
        this.bgColorPicker.value = savedBgColor;
      }
      
      const savedButtonColor = localStorage.getItem('atomlhos-button-color');
      if (savedButtonColor && this.buttonColorPicker) {
        document.documentElement.style.setProperty('--button-color', savedButtonColor);
        this.buttonColorPicker.value = savedButtonColor;
      }
      
      const savedBgImage = localStorage.getItem('atomlhos-bg-image');
      if (savedBgImage) {
        document.body.style.backgroundImage = `url(${savedBgImage})`;

        const savedTheme = localStorage.getItem('atomlhos-theme-preference');
        if (savedTheme) {
          this.setTheme(savedTheme);
        } else {
          this.updateThemeBasedOnBackground();
        }
      }
      
      // Atualizar opções de categoria
      this.updateCategoryOptions();
      this.updateShortcutsCount();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.showNotification('Erro ao carregar dados salvos.', 'error');
    }
  }
}
// Inicializar aplicação quando o DOM estiver carregado
let app; 
document.addEventListener('DOMContentLoaded', () => {
app = new AtomalhosApp();
});
