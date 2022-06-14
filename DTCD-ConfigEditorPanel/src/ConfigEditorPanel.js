import {
  AppPanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  StyleSystemAdapter,
} from '../../DTCD-SDK/index';

import { version } from './../package.json';

import fieldsMap from './fields-map';
import styles from './ConfigEditorPanel.scss';
import MainHtml from './templates/Main.html';
import HeaderHtml from './templates/Header.html';
import FooterHtml from './templates/Footer.html';

export class ConfigEditorPanel extends AppPanelPlugin {
  #guid;
  #eventSystem;
  #styleSystem;
  #logSystem;

  #rootElement;
  #configEditorBody;
  #configEditorFooter;
  #trackedPanelName;

  #watchingMode;
  #focusedPluginInstance;
  #configFocusedPlugin;

  static getRegistrationMeta() {
    return {
      version,
      type: 'panel',
      name: 'ConfigEditorPanel',
      title: 'Панель конфигурации',
      withDependencies: true,
    };
  }

  constructor(guid, selector) {
    super();
    this.#logSystem = new LogSystemAdapter(
      '0.5.0',
      guid,
      ConfigEditorPanel.getRegistrationMeta().name
    );
    this.#eventSystem = new EventSystemAdapter('0.4.0', guid);
    this.#eventSystem.registerPluginInstance(this);
    this.#styleSystem = new StyleSystemAdapter('0.5.0');

    this.#guid = guid;

    // Root element
    this.#rootElement = document.querySelector(selector);
    this.#rootElement.classList.add('ConfigEditorPanel');
    this.#rootElement.innerHTML = '';

    const style = document.createElement('style');
    this.#rootElement.appendChild(style);
    style.appendChild(document.createTextNode(styles));

    this.#configFocusedPlugin = {};
    this.#focusedPluginInstance = {};
    this.#watchingMode = true;
    this.#logSystem.debug('Root element inited');

    this.#eventSystem.subscribe(
      this.getGUID(this.getSystem('WorkspaceSystem', '0.5.0')),
      'WorkspaceCellClicked',
      guid,
      'createConfigForm'
    );

    this.#eventSystem.subscribe(
      this.getGUID(this.getSystem('AppGUISystem', '0.1.0')),
      'AreaClicked',
      guid,
      'createConfigForm'
    );

    this.#renderPanelHeader();
  }

  #renderPanelHeader() {
    this.#rootElement.innerHTML += HeaderHtml;
    this.#rootElement.innerHTML += MainHtml;

    this.#configEditorBody = this.#rootElement.querySelector('.Body-js');
    this.#trackedPanelName = this.#rootElement.querySelector('.TrackedPanelName-js');

    const checkboxWatcher = this.#rootElement.querySelector('.Checkbox_toggleWatch-js');
    checkboxWatcher.checked = this.#watchingMode;

    checkboxWatcher.addEventListener('change', e => {
      this.setWatchingMode(e.target.checked);
    });
    this.#logSystem.debug('Header of panel attached');
  }

  #renderPanelFooter() {
    if (!this.#configEditorFooter) {
      this.#configEditorFooter = document.createElement('div');
      this.#configEditorFooter.className = 'Footer';
      this.#rootElement.appendChild(this.#configEditorFooter);
    }

    this.#configEditorFooter.innerHTML = FooterHtml;

    const acceptBtn = this.#configEditorFooter.querySelector('.SubmitBtn-js');

    acceptBtn.addEventListener('click', () => {
      this.#focusedPluginInstance.setFormSettings(this.#configFocusedPlugin);
    });
    this.#logSystem.debug('Footer of panel attached');
  }

  setWatchingMode(val) {
    this.#watchingMode = val;
    this.#logSystem.info(`Watching mode is "${val}"`);
  }

  createConfigForm(evt) {
    if (this.#watchingMode && this.#guid !== evt.guid) {
      this.#trackedPanelName.textContent = evt.guid;

      this.#focusedPluginInstance = this.getInstance(evt.guid);
      try {
        const currentConfig = this.#focusedPluginInstance.getPluginConfig();
        if (currentConfig) {
          this.#configFocusedPlugin = currentConfig;
        }

        this.#logSystem.debug(`PluginConfig of instance with guid "${evt.guid}" received`);
      } catch (error) {}

      let settingsFocusedPlugin;
      try {
        settingsFocusedPlugin = this.#focusedPluginInstance.getFormSettings();
        this.#logSystem.debug(`PluginFormSettings of instance with guid "${evt.guid}" received`);
      } catch (error) {}

      this.render(settingsFocusedPlugin);
    }
  }

  render(config) {
    this.#logSystem.info('Started form rendering');

    if (config?.fields?.length) {
      this.#configEditorBody.innerHTML = '';

      const { fields = [] } = config;
      this.#fieldsProcessing(this.#configFocusedPlugin, this.#configEditorBody, fields);
      this.#renderPanelFooter();
    } else {
      this.#configEditorBody.innerHTML = `
        <div class="ComponentWrapper" style="text-align: center;">
          Настройки для данной панели отсутствуют.
        </div>
      `;
      if (this.#configEditorFooter) {
        this.#configEditorFooter.remove();
        this.#configEditorFooter = null;
      }
    }

    this.#logSystem.info('Ended form rendering');
  }

  #fieldsProcessing(configFocusedPlugin, targetContainer, fields, isRecursiveCall = false) {
    this.#logSystem.debug('Processing fields of object started');

    for (let field of fields) {
      const { component, propName, innerText, attrs, validation, handler } = field;

      this.#logSystem.debug(`Generating field with name "${propName}" and type "${component}"`);

      // Element of form field
      const fieldElement = document.createElement(fieldsMap[component]);

      switch (component) {
        case 'title':
          fieldElement.classList.add('SectionTitle');
          break;

        case 'divider':
          fieldElement.classList.add('Divider');
          break;

        case 'subtitle':
          fieldElement.classList.add('TextLabel');
          break;

        default:
          break;
      }

      // Attributes
      if (typeof attrs !== 'undefined') {
        for (let key in attrs) {
          if (!['component', 'propName', 'innerText', 'attrs'].includes(key)) {
            fieldElement.setAttribute(key, attrs[key]);
          }
        }
        this.#logSystem.debug(`Attributes of element setted`);
      }

      // Nested fields
      if (component === 'object') {
        // Initing nested filling object
        if (typeof configFocusedPlugin[propName] === 'undefined')
          configFocusedPlugin[propName] = {};

        this.#fieldsProcessing(configFocusedPlugin[propName], fieldElement, field.fields, true);
        targetContainer.appendChild(fieldElement);
        this.#logSystem.debug(`Element of nested object attached`);
        continue;
      }

      if (component === 'array') {
        // Initing nested filling object
        if (typeof configFocusedPlugin[propName] === 'undefined') {
          configFocusedPlugin[propName] = [];
        }
        this.#fieldsProcessing(configFocusedPlugin[propName], fieldElement, field.fields, true);
        targetContainer.appendChild(fieldElement);
        this.#logSystem.debug(`Element of nested fields array attached`);
        continue;
      }

      // Custom processing of components
      if (component === 'select') {
        this.#logSystem.debug(`Filling of select "item" slot started`);

        // Options of select can be is method (for generation select options by function)
        // Function should return array of fields
        if (typeof field.options === 'function')
          field.options = field.options(this.#configFocusedPlugin);

        if (Array.isArray(field.options)) {
          for (let { label, value } of field.options) {
            const optionElement = document.createElement('div');
            optionElement.innerHTML = typeof label !== 'undefined' ? label : value;
            optionElement.setAttribute('value', value);
            optionElement.setAttribute('slot', 'item');

            fieldElement.appendChild(optionElement);
          }
        }
        this.#logSystem.debug(`Filling of select "item" slot completed`);
      }

      if (typeof propName !== 'undefined') {
        // If field is form input.
        // Main sign that field is form field - propName.
        // Setting "input" event listener
        this.#logSystem.debug('Genereting of form field started');

        fieldElement.addEventListener('input', e => {
          if (typeof e.target.value === 'undefined') configFocusedPlugin[propName] = e.value;
          else configFocusedPlugin[propName] = e.target.value;
        });

        this.#logSystem.debug('Inited "input" event listener');

        // Preset value to input
        if (typeof innerText !== 'undefined') fieldElement.value = innerText;
        if (typeof configFocusedPlugin[propName] !== 'undefined')
          fieldElement.value = configFocusedPlugin[propName];

        // Set validation method to field
        if (typeof validation !== 'undefined') {
          fieldElement.validation = validation.bind(this, this.#configFocusedPlugin, propName);
        }

        this.#logSystem.debug('Form field inited');
      } else {
        this.#logSystem.debug(`Field isn't form field`);
        fieldElement.innerHTML += innerText;
      }

      if (handler) {
        fieldElement.addEventListener(handler.event, handler.callback);
      }

      if (!isRecursiveCall && component !== 'divider') {
        const newSection = document.createElement('div');
        newSection.className = 'ComponentWrapper';
        newSection.appendChild(fieldElement);
        targetContainer.appendChild(newSection);
      } else {
        targetContainer.appendChild(fieldElement);
      }

      this.#logSystem.debug('Form fields of object are created');
    }
  }
}
