# PortableMC_NPM

This module aims
to convert the excellent work by [mindstorm38](https://github.com/mindstorm38) into an NPM module
to be used in many Node.js based projects. 

## Compatability
The package is compatible with Windows and Linux Clients

## Installation
Install the package using npm
```
npm install portablemc
```
This package also requires that [portablemc](https://github.com/mindstorm38/portablemc) is installed on the system. The package will search in its default installation locations.

## Getting Started

### .config(options)
This function tells the package some key pieces of information:

**EXE_LOCATION** : Path to the PortableMC Application<br>
**LOG_LOCATION** : Path to logs location<br>
**MAIN_DIR** : Path where minecraft will be installed<br>

All values have defaults; however, the package will error if portablemc is not found.
In this case, manual declaration may be needed.

``` js
portablemc.config({
    EXE_LOCATION: PATH_TO_EXE
    LOG_LOCATION: PATH_TO_LOG,
    MAIN_DIR:PATH_TO_MC_INSTALLATION
});
```
### .authenticate(email)
This function determines which user is used to boot into the minecraft instance. It can be used both standalone and asynchronously which will return a result
``` js
portablemc.authenticate(EMAIL);
```
or
```js
const authenticatedUser = await portablemc.authenticate(EMAIL);
```
```json
{
  "username": "USERNAME",
  "uuid": "UUID",
  "email": "EMAIL (Obfuscated)"
}
```
Once this function is run, it stores the user and will use it to launch later sessions.

### .launchGame(options,installOnly)
This functions boots an instance of minecraft with the following conditions:

``` json
{
    "version":"MC VERSION",
    "loader": "LOADER"
}
```
**Version** : accepts any version. Also accepts release and snapshot

**Loader** : accepts the following
- Standard (Vanilla)
- Forge
- Fabric
- NeoForge
- Quilt
- LegacyFabric

> Currently, there is no check to ensure that the version selected supports the loader. This will be addressed in a future version.

## installOnly
Setting this to true will stop the launch of the game and only install it.

This function can be called normally and asynchronously
``` js
portablemc.launchGame(options,false);
```
or
```js
const launchGameVersion = await portablemc.launchGame(options,false);
```


## Other Functions

### .getAuthedUsers()

```js
const authenticatedUsers = portablemc.getAuthedUsers()
```

Returns an array of authenticated users


### .logout(email)

```js
const logoutUser = await portablemc.logout(email)
```

Log the user out



