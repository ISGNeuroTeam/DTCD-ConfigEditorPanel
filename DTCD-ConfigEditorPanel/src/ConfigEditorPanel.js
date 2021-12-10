import {
  PanelPlugin,
  EventSystemAdapter,
  StyleSystemAdapter,
  WorkspaceSystemAdapter,
  DataSourceSystemAdapter,
} from '../../DTCD-SDK/index';

import fieldsMap from './fields-map';

export class ConfigEditorPanel extends PanelPlugin {
  #guid;
  #eventSystem;
  #workspaceSystem;
  #dataSourceSystem;
  #styleSystem;

  #rootElement;
  #watchingMode;
  #focusedPluginInstance;
  #temp;

  static getRegistrationMeta() {
    return {
      type: 'panel',
      name: 'ConfigEditorPanel',
      title: 'Панель конфигурации',
      version: '0.1.0',
      withDependencies: true,
    };
  }

  constructor(guid, selector) {
    super();
    this.#eventSystem = new EventSystemAdapter(guid);
    this.#eventSystem.registerPluginInstance(this);
    this.#styleSystem = new StyleSystemAdapter();
    this.#workspaceSystem = new WorkspaceSystemAdapter();
    this.#dataSourceSystem = new DataSourceSystemAdapter();

    this.#guid = guid;

    // Root element
    this.#rootElement = document.querySelector(selector);
    this.#styleSystem.setVariablesToElement(this.#rootElement, this.#styleSystem.getCurrentTheme());
    this.#rootElement.style.display = 'flex';
    this.#rootElement.style['flex-flow'] = 'column';
    this.#rootElement.style.padding = '20px';

    this.#temp = {};
    this.#focusedPluginInstance = {};
    this.#watchingMode = true;

    this.#eventSystem.subscribe(
      this.getGUID(this.getSystem('WorkspaceSystem')),
      'WorkspaceCellClicked',
      guid,
      'createConfigForm'
    );
    this.#renderPanelHeader();
  }

  #renderPanelHeader() {
    this.#rootElement.innerHTML = '<h1>Настройки компонента</h1>';
    const checkboxElement = document.createElement('input');
    checkboxElement.type = 'checkbox';
    checkboxElement.checked = this.#watchingMode;
    checkboxElement.addEventListener('input', e => {
      this.#watchingMode = !this.#watchingMode;
    });
    const labelWatchingEl = document.createElement('label');
    labelWatchingEl.innerText = 'Следить за панелями';
    labelWatchingEl.appendChild(checkboxElement);
    this.#rootElement.appendChild(labelWatchingEl);
  }

  #renderPanelFooter() {
    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Сохранить';
    acceptBtn.addEventListener('click', () => {
      this.#focusedPluginInstance.setFormSettings(this.#temp);
    });
    this.#rootElement.appendChild(acceptBtn);
  }

  setWatchingMode(val) {
    this.#watchingMode = val;
  }

  createConfigForm(evt) {
    if (this.#watchingMode && this.#guid !== evt.guid) {
      this.#focusedPluginInstance = this.getInstance(evt.guid);
      const currentConfig = this.#focusedPluginInstance.getPluginConfig();
      if (currentConfig) this.#temp = currentConfig;
      this.render(this.#focusedPluginInstance.getFormSettings());
    }
  }

  render(config) {
    this.#renderPanelHeader();
    const { fields } = config;
    this.fieldsProcessing(this.#temp, this.#rootElement, fields);
    this.#renderPanelFooter();
  }

  fieldsProcessing(temp, el, fields) {
    for (let field of fields) {
      const { component, propName, propValue, attrs, validation } = field;

      // Element of form field
      const fieldElement = document.createElement(fieldsMap[component]);

      // Attributes
      if (typeof attrs !== 'undefined') {
        for (let key in attrs) {
          if (!['component', 'propName', 'propValue', 'attrs'].includes(key)) {
            fieldElement.setAttribute(key, attrs[key]);
          }
        }
      }

      // Nested fields
      if (component === 'object') {
        // Initing nested filling object
        if (typeof temp[propName] === 'undefined') temp[propName] = {};

        this.fieldsProcessing(temp[propName], fieldElement, field.fields);
        el.appendChild(fieldElement);
        continue;
      }

      if (component === 'array') {
        // Initing nested filling object
        if (typeof temp[propName] === 'undefined') temp[propName] = [];
        this.fieldsProcessing(temp[propName], fieldElement, field.fields);
        el.appendChild(fieldElement);
        continue;
      }

      // Custom processing of components
      if (component === 'select') {
        if (field.options) {
          for (let { label, value } of field.options) {
            const optionElement = document.createElement('div');
            optionElement.innerHTML = typeof label !== 'undefined' ? label : value;
            optionElement.setAttribute('value', value);
            optionElement.setAttribute('slot', 'item');

            fieldElement.appendChild(optionElement);
          }
        }
      }

      // If field is form input
      if (typeof propName !== 'undefined') {
        // "input" listener
        fieldElement.addEventListener('input', e => {
          temp[propName] = e.target.value;
        });

        // Preset value to input
        if (typeof propValue !== 'undefined') fieldElement.setAttribute('value', propValue);
        if (typeof temp[propName] !== 'undefined')
          fieldElement.setAttribute('value', temp[propName]);

        // Set validation method to field
        if (typeof validation !== 'undefined')
          fieldElement.validation = validation.bind(this, this.#temp);
      } else {
        fieldElement.textContent = propValue;
      }

      el.appendChild(fieldElement);
    }
  }
}
