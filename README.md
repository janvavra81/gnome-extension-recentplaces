# Places + Recent Indicator

GNOME Shell extenze — ikona adresáře v horním panelu, po kliknutí menu se dvěma částmi:

1. **Oblíbené adresáře** — záložky z Nautilusu (`~/.config/gtk-3.0/bookmarks`); kliknutí otevře adresář v Nautilusu.
2. **Nedávné soubory** — naposledy přidané záznamy z `~/.local/share/recently-used.xbel` (max. 10, jen existující lokální soubory):
   - **levé tlačítko** — spustí soubor ve výchozí aplikaci,
   - **pravé tlačítko** — otevře adresář souboru v Nautilusu (soubor se v něm zvýrazní).

Každá položka má ikonu (adresáře ikonu složky, soubory symbolickou ikonu podle MIME typu). Obsah menu se načítá vždy znovu při jeho otevření, takže je stále aktuální. Extenze nemá žádné nastavení.

UUID: `recentplaces@janvavra81`, licence GPL-2.0-or-later.

## Struktura projektu

GNOME 45 přešel na ES moduly, které nejsou zpětně kompatibilní, proto existují dvě varianty
se stejnou funkcionalitou (při úpravách je nutné měnit obě):

```
gnome43/   varianta pro GNOME Shell 43–44 (legacy imports)
gnome45/   varianta pro GNOME Shell 45–49 (ESM)
po/        překlady (gettext, domain "recentplaces")
build.sh   sestaví oba zipy pro upload do dist/
```

## Sestavení balíčků

```bash
./build.sh
```

Vytvoří v `dist/` dva zipy (`…gnome-43-44.zip` a `…gnome-45-49.zip`) včetně zkompilovaných překladů.

## Upload na extensions.gnome.org

1. Přihlásit se na https://extensions.gnome.org/
2. Otevřít https://extensions.gnome.org/upload/
3. Nahrát **oba** zipy z `dist/` (postupně, každý zvlášť) — mají stejné UUID,
   e.g.o. pak sám nabízí správnou verzi podle verze GNOME Shellu návštěvníka.
4. Počkat na schválení reviewerem (může trvat dny až týdny); případné připomínky
   chodí e-mailem a zobrazují se u extenze po přihlášení.

## Lokální instalace (GNOME 43)

```bash
ln -sfn "$(pwd)/gnome43" ~/.local/share/gnome-shell/extensions/recentplaces@janvavra81
msgfmt po/cs.po -o gnome43/locale/cs/LC_MESSAGES/recentplaces.mo
gnome-extensions enable recentplaces@janvavra81
```

Po první instalaci (nebo změně kódu) je potřeba se odhlásit a přihlásit — na Waylandu nelze shell restartovat za běhu.

## Testování bez odhlášení

```bash
dbus-run-session -- gnome-shell --nested --wayland
```
