// 等待主 HTML 文档加载完成后再执行脚本
document.addEventListener('DOMContentLoaded', () => {

    // --- 全局变量定义 ---
    // 用于存储从 HTML 文件加载的 DOM 元素，避免重复查询
    const elements = {};

    /**
     * 异步加载 HTML 文件内容并插入到页面中
     * @param {string} url - HTML 文件的路径
     * @param {HTMLElement} targetElement - 要插入内容的目标父元素
     */
    async function loadComponent(url, targetElement) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`无法加载 ${url}: ${response.statusText}`);
            const html = await response.text();
            targetElement.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error('加载组件失败:', error);
        }
    }

    /**
     * 初始化函数：加载所有 HTML 组件并设置事件监听器
     */
    async function initialize() {
        // 并行加载所有必要的 HTML 组件
        await Promise.all([
            loadComponent('toolbar.html', document.body),
            loadComponent('library.html', document.body),
            loadComponent('upload.html', document.body),
            loadComponent('local_library.html', document.body),
            // 将 settings.html 加载到指定的容器中
            loadComponent('settings.html', document.getElementById('settings_container'))
        ]);

        // HTML 加载完成后，缓存所有需要操作的 DOM 元素
        cacheDOMElements();
        
        // 为所有缓存的元素设置事件监听
        setupEventListeners();

        // 默认隐藏所有模态窗口
        hideAllModals();
    }
    
    /**
     * 缓存所有需要频繁操作的 DOM 元素
     */
    function cacheDOMElements() {
        // 模态窗口的遮罩层
        elements.libraryModal = document.getElementById('story_library_modal_overlay');
        elements.uploadModal = document.getElementById('story_upload_modal_overlay');
        elements.localLibraryModal = document.getElementById('story_local_library_modal_overlay');

        // 打开按钮
        elements.openLibraryBtn = document.getElementById('open_story_library_btn');
        elements.openUploadBtn = document.getElementById('open_upload_modal_btn');
        elements.openLocalLibraryBtn = document.getElementById('open_local_library_btn');

        // 关闭按钮
        elements.closeLibraryBtn = document.getElementById('story_library_close_btn');
        elements.closeUploadBtn = document.getElementById('story_upload_close_btn');
        elements.closeLocalLibraryBtn = document.getElementById('story_local_library_close_btn');

        // 设置相关的元素
        elements.enableLibraryCheckbox = document.getElementById('enable_story_library');
        elements.toolbar = document.getElementById('story_library_toolbar');
    }

    /**
     * 为所有交互元素绑定事件监听器
     */
    function setupEventListeners() {
        // --- 打开模态窗口 ---
        elements.openLibraryBtn?.addEventListener('click', () => showModal(elements.libraryModal));
        elements.openUploadBtn?.addEventListener('click', () => showModal(elements.uploadModal));
        elements.openLocalLibraryBtn?.addEventListener('click', () => showModal(elements.localLibraryModal));

        // --- 关闭模态窗口 ---
        elements.closeLibraryBtn?.addEventListener('click', () => hideModal(elements.libraryModal));
        elements.closeUploadBtn?.addEventListener('click', () => hideModal(elements.uploadModal));
        elements.closeLocalLibraryBtn?.addEventListener('click', () => hideModal(elements.localLibraryModal));
        
        // --- 点击遮罩层关闭窗口 ---
        // 只有当点击事件的目标是遮罩层本身时才关闭，防止点击内容区域也关闭
        elements.libraryModal?.addEventListener('click', function(e) { if (e.target === this) hideModal(this); });
        elements.uploadModal?.addEventListener('click', function(e) { if (e.target === this) hideModal(this); });
        elements.localLibraryModal?.addEventListener('click', function(e) { if (e.target === this) hideModal(this); });

        // --- 设置开关 ---
        elements.enableLibraryCheckbox?.addEventListener('change', (e) => {
            if (elements.toolbar) {
                elements.toolbar.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // 默认触发一次 change 事件以根据初始状态设置工具栏可见性
        elements.enableLibraryCheckbox?.dispatchEvent(new Event('change'));
    }

    /**
     * 显示指定的模态窗口
     * @param {HTMLElement} modalElement - 模态窗口的遮罩层元素
     */
    function showModal(modalElement) {
        if (modalElement) modalElement.style.display = 'flex';
    }

    /**
     * 隐藏指定的模态窗口
     * @param {HTMLElement} modalElement - 模态窗口的遮罩层元素
     */
    function hideModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';
    }
    
    /**
     * 隐藏所有模态窗口，用于初始化
     */
    function hideAllModals() {
        hideModal(elements.libraryModal);
        hideModal(elements.uploadModal);
        hideModal(elements.localLibraryModal);
    }

    // --- 程序入口 ---
    initialize();

});