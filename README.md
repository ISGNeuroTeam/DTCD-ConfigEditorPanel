# DTCD-ConfigEditorPanel

Panel for plugin setting. Created to handle plugin settings objects.

## Getting Started

In order to use this plugin you need to download it, build and move build-file to _plugins_ folder on DTCD server.

## How to use

For using of this, you should implements getFormSettings and setFormSettings methods of plugins.

### getFormSettings method

This method returns needed for form creating object. In this object should be property 'fields' with Array of objects value

Example:

`{ fields:[ { component: 'text', propName: 'title', propValue: 'name' attrs: { label: 'Title of plugin', } validation:(val)=>{ if(val[0]===val[0].toUpperCase()) return {isValid:true} else return {isValid:false,message:"First letter must be capitalized"} } },{ component: 'datasource', propName: 'dataSource', attrs: { label: 'ID of created DataSource', placeholder: 'Select datasource', required: true } } ] }`

### Field object properties

| property   | type     | description                                                                                                              |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| component  | string   | Type of field in generated form (key in field map)                                                                       |
| propName   | string   | Key of settings object                                                                                                   |
| propValue  | any      | Default value of field                                                                                                   |
| attrs      | object   | Attributes of DOM element                                                                                                |
| validation | function | Function that will be execute by 'validate' method of DOM element field form                                             |
| fields     | Array    | Array of field object for fields with 'array' and 'object' component property value. Uses for nested fields of property. |

### Prerequisites

- [node.js](https://nodejs.org/en/) LTS version 14.x.x
- [DTCD](https://github.com/ISGNeuroTeam/DTCD) v0.5.0
- `make` utility

### Building

```
make build
```

## Running the tests

```
make test
```

## Create build package

```
make pack
```

## Clear dependencies

```
make clean
```

## Deployment

Use `make pack` to get a deployable tarball. Move it to plugins directory and unarchive it with the following commands:

```
tar -zxf DTCD-ConfigEditorPanel-*.tar.gz ./DTCD-DTCD-ConfigEditorPanel
```

## Built With

- [DTCD-SDK](https://github.com/ISGNeuroTeam/DTCD-SDK)
- [Rollup.js](https://rollupjs.org/guide/en/) - JavaScript project builder

## Contributing

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/ISGNeuroTeam/DTCD-ConfigEditorPanel/tags).

Also you can see the [CHANGELOG](CHANGELOG.md) file.

## Authors

- Konstantin Rozov (konstantin@isgneuro.com)

## License

This project is licensed under the OT.PLATFORM license agreement - see the [LICENSE](LICENSE.md) file for details

## Acknowledgments
