# Snapchat Desktop

App Linux autonome pour Snapchat Web. Pas besoin d'installer Chrome ou Chromium sur le systeme: le moteur est embarque dans le paquet.

![Apercu](assets/screenshot.png)

## Installer (.deb)

```bash
sudo apt install ./snapchat-desktop_1.2.0_amd64.deb
```

Puis cherche **Snapchat** dans le menu des applications.

## Developper

```bash
npm install
npm start
```

## Generer le .deb

```bash
npm run dist:deb
```

Le fichier sort dans `dist/`.

## Licence

MIT
