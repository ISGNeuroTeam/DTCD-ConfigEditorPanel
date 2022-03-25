import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  StyleSystemAdapter,
} from '../../DTCD-SDK/index';

import { version } from './../package.json';

import './../fonts/fonts.css';
import fieldsMap from './fields-map';
import styles from './ConfigEditorPanel.scss';
import MainHtml from './templates/Main.html';
import HeaderHtml from './templates/Header.html';
import FooterHtml from './templates/Footer.html';

export class ConfigEditorPanel extends PanelPlugin {

  #guid;
  #eventSystem;
  #styleSystem;
  #logSystem;

  #rootElement;
  #configEditorPanel;
  #configEditorBody;
  #watchingMode;
  #focusedPluginInstance;
  #temp;

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
    this.#logSystem = new LogSystemAdapter('0.5.0', guid, ConfigEditorPanel.getRegistrationMeta().name)
    this.#eventSystem = new EventSystemAdapter('0.4.0', guid);
    this.#eventSystem.registerPluginInstance(this);
    this.#styleSystem = new StyleSystemAdapter('0.4.0');

    this.#guid = guid;

    // Root element
    this.#rootElement = document.querySelector(selector);
    this.#styleSystem.setVariablesToElement(this.#rootElement, this.#styleSystem.getCurrentTheme());
    this.#rootElement.classList.add('ConfigEditorPanel');
    // this.#rootElement.innerHTML = MainHtml;
    // this.#configEditorBody = this.#rootElement.querySelector('.Body-js');
    this.#renderPanelHeader();

    const style = document.createElement('style');
    this.#rootElement.appendChild(style);
    style.appendChild(document.createTextNode(styles));

    this.#temp = {};
    this.#focusedPluginInstance = {};
    this.#watchingMode = true;
    this.#logSystem.debug('Root element inited');

    // this.#eventSystem.subscribe(
    //   this.getGUID(this.getSystem('WorkspaceSystem', '0.4.0')),
    //   'WorkspaceCellClicked',
    //   guid,
    //   'createConfigForm'
    // );
  }

  #renderPanelHeader() {
    this.#rootElement.innerHTML = HeaderHtml;
    this.#rootElement.innerHTML += MainHtml;
    this.#configEditorBody = this.#rootElement.querySelector('.Body-js');

    const checkboxWatcher = this.#rootElement.querySelector('.Checkbox_toggleWatch-js');
    checkboxWatcher.checked = this.#watchingMode;

    checkboxWatcher.addEventListener('input', e => {
      this.#watchingMode = !this.#watchingMode;
    });

    this.#logSystem.debug('Header of panel attached');
  }

  #renderPanelFooter() {
    this.#rootElement.innerHTML += FooterHtml;
    const acceptBtn = this.#rootElement.querySelector('[name="accept-btn"]');

    acceptBtn.addEventListener('click', () => {
      this.#focusedPluginInstance.setFormSettings(this.#temp);
    });
    
    this.#logSystem.debug('Footer of panel attached');
  }

  setWatchingMode(val) {
    this.#watchingMode = val;
    this.#logSystem.info(`Watching mode is "${val}"`)
  }

  createConfigForm(evt) {
    if (this.#watchingMode && this.#guid !== evt.guid) {
      this.#focusedPluginInstance = this.getInstance(evt.guid);
      const currentConfig = this.#focusedPluginInstance.getPluginConfig();
      this.#logSystem.debug(`PluginConfig of instance with guid "${evt.guid}" received`)
      if (currentConfig) this.#temp = currentConfig;
      this.render(this.#focusedPluginInstance.getFormSettings());
    }
  }

  render(config) {
    this.#logSystem.info('Started form rendering');
    // this.#renderPanelHeader();
    const { fields = [] } = config;
    this.fieldsProcessing(this.#temp, this.#configEditorBody, fields);
    this.#renderPanelFooter();
  }

  fieldsProcessing(temp, el, fields) {
    this.#logSystem.debug('Processing fields of object started');

    for (let field of fields) {
      const { component, propName, propValue, attrs, validation } = field;
      this.#logSystem.debug(`Generating field with name "${propName}" and type "${component}"`)

      // Element of form field
      const fieldElement = document.createElement(fieldsMap[component]);

      // Attributes
      if (typeof attrs !== 'undefined') {
        for (let key in attrs) {
          if (!['component', 'propName', 'propValue', 'attrs'].includes(key)) {
            fieldElement.setAttribute(key, attrs[key]);
          }
        }
        this.#logSystem.debug(`Attributes of element setted`)
      }

      // Nested fields
      if (component === 'object') {
        // Initing nested filling object
        if (typeof temp[propName] === 'undefined') temp[propName] = {};

        this.fieldsProcessing(temp[propName], fieldElement, field.fields);
        el.appendChild(fieldElement);
        this.#logSystem.debug(`Element of nested object attached`)
        continue;
      }

      if (component === 'array') {
        // Initing nested filling object
        if (typeof temp[propName] === 'undefined') {
          temp[propName] = [];
        }
        this.fieldsProcessing(temp[propName], fieldElement, field.fields);
        el.appendChild(fieldElement);
        this.#logSystem.debug(`Element of nested fields array attached`);
        continue;
      }

      // Custom processing of components
      if (component === 'select') {
        this.#logSystem.debug(`Filling of select "item" slot started`);

        // Options of select can be is method (for generation select options by function)
        // Function should return array of fields
        if (typeof field.options === 'function') field.options = field.options(this.#temp);

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

      // If field is form input.
      // Main sign that field is form field - propName.
      if (typeof propName !== 'undefined') {
        // Setting "input" event listener
        this.#logSystem.debug("Genereting of form field started")
        fieldElement.addEventListener('input', e => {
          if (typeof e.target.value === 'undefined') temp[propName] = e.value;
          else temp[propName] = e.target.value;
        });
        this.#logSystem.debug('Inited "input" event listener')

        // Preset value to input
        if (typeof propValue !== 'undefined') fieldElement.value = propValue;
        if (typeof temp[propName] !== 'undefined') fieldElement.value = temp[propName];

        // Set validation method to field
        if (typeof validation !== 'undefined')
          fieldElement.validation = validation.bind(this, this.#temp, propName);
        this.#logSystem.debug('Form field inited')
      } else {
        this.#logSystem.debug("Field isn't form field")
        fieldElement.textContent = propValue;
      }

      el.appendChild(fieldElement);
      fieldElement.dispatchEvent(new Event('input'));
      this.#logSystem.debug("Form fields of object are created")
    }
  }

}
