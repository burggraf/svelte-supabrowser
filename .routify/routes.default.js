

export default {
  "meta": {},
  "id": "_default",
  "_regex": {},
  "_paramKeys": {},
  "file": {
    "path": "src/routes/_module.svelte",
    "dir": "src/routes",
    "base": "_module.svelte",
    "ext": ".svelte",
    "name": "_module"
  },
  "asyncModule": () => import('../src/routes/_module.svelte'),
  "rootName": "default",
  "routifyDir": import.meta.url,
  "children": [
    {
      "meta": {
        "dynamic": true,
        "dynamicSpread": true
      },
      "id": "_default_____fallback__svelte",
      "_regex": {},
      "_paramKeys": {},
      "name": "[...fallback]",
      "file": {
        "path": "src/routes/[...fallback].svelte",
        "dir": "src/routes",
        "base": "[...fallback].svelte",
        "ext": ".svelte",
        "name": "[...fallback]"
      },
      "asyncModule": () => import('../src/routes/[...fallback].svelte'),
      "children": []
    },
    {
      "meta": {},
      "id": "_default_folder",
      "_regex": {},
      "_paramKeys": {},
      "name": "folder",
      "module": false,
      "file": {
        "path": "src/routes/folder",
        "dir": "src/routes",
        "base": "folder",
        "ext": "",
        "name": "folder"
      },
      "children": [
        {
          "meta": {
            "dynamic": true
          },
          "id": "_default_folder__folder__svelte",
          "_regex": {},
          "_paramKeys": {},
          "name": "[folder]",
          "file": {
            "path": "src/routes/folder/[folder].svelte",
            "dir": "src/routes/folder",
            "base": "[folder].svelte",
            "ext": ".svelte",
            "name": "[folder]"
          },
          "asyncModule": () => import('../src/routes/folder/[folder].svelte'),
          "children": []
        }
      ]
    },
    {
      "meta": {},
      "id": "_default_home_svelte",
      "_regex": {},
      "_paramKeys": {},
      "name": "home",
      "file": {
        "path": "src/routes/home.svelte",
        "dir": "src/routes",
        "base": "home.svelte",
        "ext": ".svelte",
        "name": "home"
      },
      "asyncModule": () => import('../src/routes/home.svelte'),
      "children": []
    },
    {
      "meta": {},
      "id": "_default_index_svelte",
      "_regex": {},
      "_paramKeys": {},
      "name": "index",
      "file": {
        "path": "src/routes/index.svelte",
        "dir": "src/routes",
        "base": "index.svelte",
        "ext": ".svelte",
        "name": "index"
      },
      "asyncModule": () => import('../src/routes/index.svelte'),
      "children": []
    }
  ]
}