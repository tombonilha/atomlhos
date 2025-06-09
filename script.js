// script.js
class AtomalhosApp {
  constructor() {
    this.shortcuts = [];
    this.categories = new Set(['trabalho', 'social', 'entretenimento', 'educacao', 'noticias', 'ferramentas']);
    this.currentFilter = 'all';
    this.searchTerm = '';
    
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
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 600,
        easing: 'ease-in-out',
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
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: () => this.saveData()
      });
    }
  }

  showLoading() {
    this.loadingOverlay.classList.add('show');
  }

  hideLoading() {
    this.loadingOverlay.classList.remove('show');
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
      this.showNotification('Atalho adicionado com sucesso!', 'success');
    } catch (error) {
      this.showNotification('Erro ao adicionar atalho', 'error');
      console.error('Erro ao adicionar atalho:', error);
    } finally {
      this.hideLoading();
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  async addShortcut(name, url, category = '', isFavorite = false) {
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
    if (typeof AOS !== 'undefined') {
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
      
      return 'fas fa-globe';
    } catch {
      return 'fas fa-globe';
    }
  }

  async getWebsitePreview(url) {
    try {
      // Usar múltiplos serviços de preview
      const previewServices = [
        `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
        `https://api.urlbox.io/v1/ca482d7e-9417-4569-90fe-80f7c5e1c781/png?url=${encodeURIComponent(url)}&width=400&height=300`
      ];
      
      for (const serviceUrl of previewServices) {
        try {
          const response = await fetch(serviceUrl);
          const data = await response.json();
          
          if (data.status === 'success' && data.data) {
            return {
              title: data.data.title || new URL(url).hostname,
              description: data.data.description || '',
              image: data.data.screenshot?.url || data.data.image?.url,
              logo: data.data.logo?.url
            };
          }
        } catch (error) {
          console.log('Serviço de preview não disponível:', error);
          continue;
        }
      }
      
      // Fallback: extrair informações básicas da URL
      const urlObj = new URL(url);
      return {
        title: urlObj.hostname,
        description: `Site: ${urlObj.hostname}`,
        image: null,
        logo: null
      };
    } catch (error) {
      console.log('Preview não disponível:', error);
      return null;
    }
  }

  renderShortcut(shortcut) {
    const container = shortcut.category ? 
      this.getOrCreateCategoryContainer(shortcut.category) : 
      this.shortcutsContainer;
    
    const div = document.createElement("div");
    div.className = `shortcut ${shortcut.isFavorite ? 'favorite' : ''}`;
    div.dataset.id = shortcut.id;
    div.dataset.name = shortcut.name.toLowerCase();
    div.dataset.category = shortcut.category;
    div.setAttribute('data-aos', 'fade-up');
    div.setAttribute('data-aos-delay', Math.random() * 200);
    
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
        <button class="action-btn favorite-btn ${shortcut.isFavorite ? 'active' : ''}" 
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
      div.classList.add('aos-animate');
    }, 100);
  }

  generatePreviewHtml(shortcut) {
    if (shortcut.preview?.image) {
      return `<div class="shortcut-preview" style="background-image: url('${shortcut.preview.image}')"></div>`;
    } else if (shortcut.icon && !shortcut.icon.startsWith('fa')) {
      return `<div class="shortcut-preview"><img src="${shortcut.icon}" alt="Ícone" style="width: 32px; height: 32px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><i class="fas fa-globe" style="display: none;"></i></div>`;
    } else {
      return `<div class="shortcut-preview"><i class="${shortcut.icon || 'fas fa-globe'}"></i></div>`;
    }
  }

  getOrCreateCategoryContainer(category) {
    let categorySection = document.getElementById(`category-${category}`);
    
    if (!categorySection) {
      categorySection = document.createElement('div');
      categorySection.className = 'category-section';
      categorySection.id = `category-${category}`;
      categorySection.setAttribute('data-aos', 'fade-up');
      
      categorySection.innerHTML = `
        <h2 class="category-title">
          <span class="category-info">
            <i class="fas fa-folder"></i> ${this.formatCategoryName(category)}
          </span>
          <div class="category-actions">
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
      this.setupSortableContainer(categorySection.querySelector('.shortcuts-grid'));
    }
    
    return categorySection.querySelector('.shortcuts-grid');
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
      this.showNotification(message, 'success');
    }
  }

  toggleFavorite(id) {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      shortcut.isFavorite = !shortcut.isFavorite;
      this.renderAllShortcuts();
      this.saveData();
      
      const message = shortcut.isFavorite ? 'Adicionado aos favoritos!' : 'Removido dos favoritos!';
      this.showNotification(message, 'success');
    }
  }

  deleteShortcut(id) {
    if (confirm('Tem certeza que deseja excluir este atalho?')) {
      this.shortcuts = this.shortcuts.filter(s => s.id !== id);
      this.renderAllShortcuts();
      this.saveData();
      this.updateShortcutsCount();
      this.showNotification('Atalho excluído com sucesso!', 'success');
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
      this.showNotification('Atalho duplicado com sucesso!', 'success');
      
      // Refresh AOS para novos elementos
      if (typeof AOS !== 'undefined') {
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
    const existingModal = document.getElementById('edit-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Editar Atalho</h3>
          <button class="modal-close" onclick="app.closeEditModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="edit-form" onsubmit="app.saveEditedShortcut(event, '${shortcut.id}')">
          <div class="form-group">
            <label for="edit-name">Nome do site:</label>
            <input type="text" id="edit-name" value="${shortcut.name}" required>
          </div>
          <div class="form-group">
            <label for="edit-url">URL:</label>
            <input type="url" id="edit-url" value="${shortcut.url}" required>
          </div>
          <div class="form-group">
            <label for="edit-category">Categoria:</label>
            <select id="edit-category">
              <option value="">Sem categoria</option>
              ${Array.from(this.categories).sort().map(cat => 
                `<option value="${cat}" ${cat === shortcut.category ? 'selected' : ''}>${this.formatCategoryName(cat)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-new-category">Nova categoria (opcional):</label>
            <input type="text" id="edit-new-category" placeholder="Digite uma nova categoria">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" onclick="app.closeEditModal()">Cancelar</button>
            <button type="submit" class="btn-primary">Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focar no primeiro campo
    setTimeout(() => {
      document.getElementById('edit-name').focus();
    }, 100);
  }

  closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
      modal.remove();
    }
  }

  async saveEditedShortcut(event, id) {
    event.preventDefault();
    
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (!shortcut) return;
    
    const name = document.getElementById('edit-name').value.trim();
    const url = document.getElementById('edit-url').value.trim();
    let category = document.getElementById('edit-category').value;
    const newCategory = document.getElementById('edit-new-category').value.trim();
    
    if (newCategory) {
      category = newCategory.toLowerCase();
      this.categories.add(category);
      this.updateCategoryOptions();
    }
    
    // Atualizar o atalho
    shortcut.name = name;
    shortcut.url = url;
    shortcut.category = category;
    
    // Recarregar ícone e preview se a URL mudou
    if (shortcut.url !== url) {
      shortcut.icon = await this.getWebsiteIcon(url);
      shortcut.preview = await this.getWebsitePreview(url);
    }
    
    // Fechar modal
    this.closeEditModal();
    
    // Re-renderizar atalhos
    this.renderAllShortcuts();
    this.saveData();
    this.updateShortcutsCount();
    this.showNotification('Atalho atualizado com sucesso!', 'success');
  }

  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.filterShortcuts();
  }

  handleCategoryFilter(category) {
    this.currentFilter = category || 'all';
    this.updateFilterButtons();
    this.filterShortcuts();
  }

  showFavorites() {
    this.currentFilter = 'favorites';
    this.updateFilterButtons();
    this.filterShortcuts();
  }

  showAll() {
    this.currentFilter = 'all';
    this.updateFilterButtons();
    this.filterShortcuts();
  }

  updateFilterButtons() {
    this.showFavoritesBtn.classList.toggle('active', this.currentFilter === 'favorites');
    this.showAllBtn.classList.toggle('active', this.currentFilter === 'all');
  }

  filterShortcuts() {
    const shortcuts = document.querySelectorAll('.shortcut');
    let visibleCount = 0;
    
    shortcuts.forEach(shortcut => {
      const name = shortcut.dataset.name;
      const category = shortcut.dataset.category;
      const isFavorite = shortcut.classList.contains('favorite');
      
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
      
      shortcut.classList.toggle('hidden', !show);
      if (show) visibleCount++;
    });
    
    // Mostrar/ocultar seções vazias
    this.updateSectionVisibility();
    
    // Mostrar mensagem se não houver resultados
    this.showNoResultsMessage(visibleCount === 0);
  }

  showNoResultsMessage(show) {
    let noResultsMsg = document.getElementById('no-results-message');
    
    if (show && !noResultsMsg) {
      noResultsMsg = document.createElement('div');
      noResultsMsg.id = 'no-results-message';
      noResultsMsg.className = 'no-results';
      noResultsMsg.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.7);">
          <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <h3>Nenhum atalho encontrado</h3>
          <p>Tente ajustar os filtros ou adicionar novos atalhos.</p>
        </div>
      `;
      this.shortcutsContainer.parentNode.appendChild(noResultsMsg);
    } else if (!show && noResultsMsg) {
      noResultsMsg.remove();
    }
  }

  updateSectionVisibility() {
    const sections = document.querySelectorAll('.category-section');
    
    sections.forEach(section => {
      const visibleShortcuts = section.querySelectorAll('.shortcut:not(.hidden)');
      section.style.display = visibleShortcuts.length > 0 ? 'block' : 'none';
    });
  }

  updateCategoryOptions() {
    // Atualizar select do formulário
    const currentValue = this.categorySelect.value;
    this.categorySelect.innerHTML = '<option value="">Selecionar categoria</option>';
    
    Array.from(this.categories).sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = this.formatCategoryName(category);
      this.categorySelect.appendChild(option);
    });
    
    this.categorySelect.value = currentValue;
    
    // Atualizar filtro de categorias
    const currentFilter = this.categoryFilter.value;
    this.categoryFilter.innerHTML = '<option value="">Todas as categorias</option>';
    
    Array.from(this.categories).sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = this.formatCategoryName(category);
      this.categoryFilter.appendChild(option);
    });
    
    this.categoryFilter.value = currentFilter;
  }

  renderAllShortcuts() {
    // Limpar containers
    this.shortcutsContainer.innerHTML = '';
    this.favoritesContainer.innerHTML = '';
    this.categoriesContainer.innerHTML = '';
    
    // Renderizar todos os atalhos
    this.shortcuts.forEach((shortcut, index) => {
      setTimeout(() => this.renderShortcut(shortcut), index * 50);
    });
    
    // Atualizar visibilidade da seção de favoritos
    const hasFavorites = this.shortcuts.some(s => s.isFavorite);
    this.favoritesSection.style.display = hasFavorites ? 'block' : 'none';
    
    // Aplicar filtros atuais
    setTimeout(() => this.filterShortcuts(), 500);
  }

  // Métodos de configuração
  toggleSettings() {
    this.settingsPanel.classList.toggle("hidden");
  }

  closeSettings() {
    this.settingsPanel.classList.add("hidden");
  }

  updateBgColor(color) {
    document.body.style.setProperty('--bg-color', color);
    this.saveData();
  }

  updateButtonColor(color) {
    document.body.style.setProperty('--button-color', color);
    this.saveData();
  }

  handleBgImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.showNotification('Imagem muito grande. Máximo 5MB.', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        document.body.style.backgroundImage = `url(${reader.result})`;
        localStorage.setItem("bgImage", reader.result);
        this.saveData();
        this.showNotification('Imagem de fundo atualizada!', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  removeBgImage() {
    if (confirm('Tem certeza que deseja remover a imagem de fundo?')) {
      document.body.style.backgroundImage = "none";
      localStorage.removeItem("bgImage");
      this.saveData();
      this.showNotification('Imagem de fundo removida!', 'success');
    }
  }

  // Persistência de dados
  saveData() {
    const data = {
      shortcuts: this.shortcuts,
      categories: Array.from(this.categories),
      bgColor: document.body.style.getPropertyValue('--bg-color'),
      buttonColor: document.body.style.getPropertyValue('--button-color'),
      bgImage: localStorage.getItem("bgImage") || null,
      version: '2.0'
    };
    localStorage.setItem("atomlhosData", JSON.stringify(data));
  }

  loadData() {
    const data = JSON.parse(localStorage.getItem("atomlhosData"));
    if (!data) return;

    // Carregar configurações visuais
    if (data.bgColor) {
      document.body.style.setProperty('--bg-color', data.bgColor);
      this.bgColorPicker.value = data.bgColor;
    }
    if (data.buttonColor) {
      document.body.style.setProperty('--button-color', data.buttonColor);
      this.buttonColorPicker.value = data.buttonColor;
    }
    if (data.bgImage) {
      document.body.style.backgroundImage = `url(${data.bgImage})`;
    }

    // Carregar categorias
    if (data.categories) {
      this.categories = new Set(data.categories);
    }

    // Carregar atalhos
    if (data.shortcuts) {
      if (data.version === '2.0') {
        // Dados na nova estrutura
        this.shortcuts = data.shortcuts;
      } else {
        // Migrar dados antigos
        this.shortcuts = data.shortcuts.map(shortcut => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: shortcut.name,
          url: shortcut.url,
          category: '',
          isFavorite: false,
          icon: 'fas fa-globe',
          preview: null,
          createdAt: new Date().toISOString()
        }));
        this.saveData(); // Salvar dados migrados
      }
    }

    this.updateCategoryOptions();
    this.renderAllShortcuts();
  }

  updateShortcutsCount() {
    const count = this.shortcuts.length;
    const countElement = document.getElementById('shortcuts-count');
    if (countElement) {
      countElement.textContent = `${count} ${count === 1 ? 'atalho' : 'atalhos'}`;
    }
    
    // Mostrar/ocultar estado vazio
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.style.display = count === 0 ? 'block' : 'none';
    }
    
    // Ocultar seção sem categoria se não houver atalhos sem categoria
    const uncategorizedShortcuts = this.shortcuts.filter(s => !s.category);
    const uncategorizedSection = document.getElementById('uncategorized-section');
    if (uncategorizedSection) {
      uncategorizedSection.style.display = uncategorizedShortcuts.length > 0 ? 'block' : 'none';
    }
  }

  // Corrigir problema das imagens
  async getWebsiteIcon(url) {
    try {
      const domain = new URL(url).hostname;
      
      // Múltiplas fontes de favicon
      const iconSources = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://${domain}/favicon.ico`,
        `https://api.faviconkit.com/${domain}/64`,
        `https://www.google.com/s2/favicons?domain=${domain}`
      ];
      
      for (const iconUrl of iconSources) {
        try {
          const response = await fetch(iconUrl, { method: 'HEAD' });
          if (response.ok) {
            return iconUrl;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Fallback para ícone genérico
      return 'fas fa-globe';
    } catch (error) {
      console.log('Erro ao obter ícone:', error);
      return 'fas fa-globe';
    }
  }

  async getWebsitePreview(url) {
    try {
      // Usar microlink.io para preview
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`);
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        return {
          image: data.data.screenshot?.url,
          title: data.data.title,
          description: data.data.description
        };
      }
      
      return null;
    } catch (error) {
      console.log('Preview não disponível:', error);
      return null;
    }
  }

  generatePreviewHtml(shortcut) {
    if (shortcut.preview?.image) {
      return `<div class="shortcut-preview" style="background-image: url('${shortcut.preview.image}')"></div>`;
    } else if (shortcut.icon && !shortcut.icon.startsWith('fa')) {
      return `<div class="shortcut-preview">
        <img src="${shortcut.icon}" alt="Ícone" 
             style="width: 48px; height: 48px; object-fit: contain;" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <i class="fas fa-globe" style="display: none; font-size: 2rem; color: rgba(255,255,255,0.7);"></i>
      </div>`;
    } else {
      return `<div class="shortcut-preview">
        <i class="${shortcut.icon || 'fas fa-globe'}" style="font-size: 2rem; color: rgba(255,255,255,0.7);"></i>
      </div>`;
    }
  }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AtomalhosApp();
});

