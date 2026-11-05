# CNN Explainer

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | Deutsch

Eine interaktive Visualisierung, mit der auch Einsteigerinnen und Einsteiger Convolutional Neural Networks (CNNs) verstehen können.

## Verwendung

Wählen Sie in der [Onlinedemo](https://poloclub.github.io/cnn-explainer/) im Sprachmenü „Deutsch“ oder ergänzen Sie die URL um `?lang=de`. Die Onlinedemo erhält diese Funktion nach dem Zusammenführen und Bereitstellen der Änderungen. Bis dahin können Sie die Übersetzung lokal ausprobieren.

Verfügbar sind Englisch, vereinfachtes Chinesisch, Japanisch und Deutsch. Ohne Sprachangabe oder bei einer nicht unterstützten Sprache wird Englisch angezeigt. Ein Sprachwechsel lädt die Seite neu, damit auch die Beschriftungen der Visualisierung aktualisiert werden. Andere URL-Parameter und der Artikelanker bleiben erhalten.

Übersetzt sind Artikel, Bildunterschriften, Bedienelemente, Fehlermeldungen, Klassennamen und Erläuterungen in den Visualisierungen. Das ursprüngliche Video und Texte innerhalb vorhandener Animationsbilder bleiben auf Englisch. Das externe Empfehlungswidget und der YouTube-Player verwenden ihre eigenen Spracheinstellungen.

## Lokal starten

Installieren Sie Node.js und npm und führen Sie folgende Befehle aus:

```bash
git clone https://github.com/poloclub/cnn-explainer.git
cd cnn-explainer
npm install
npm run dev
```

Öffnen Sie die [lokale deutsche Version](http://localhost:3000/?lang=de). Produktionsversion erstellen und Übersetzungen prüfen:

```bash
npm run build
node tests/i18n.mjs
```

Der Trainingscode liegt in [`tiny-vgg/`](tiny-vgg). Hinweise zu eigenen Modellen oder Bildklassen finden Sie in [#8](https://github.com/poloclub/cnn-explainer/issues/8) und [#14](https://github.com/poloclub/cnn-explainer/issues/14).

## Übersetzungen pflegen

Kurze Oberflächentexte stehen in [`src/locales/de.js`](src/locales/de.js), der Artikel im deutschen Zweig von [`src/article/Article.svelte`](src/article/Article.svelte). Die Artikelversionen teilen sich Stile, Formeln, Anker und Interaktionslogik. Zeigen Sie neue Oberflächentexte mit `t()` an und ergänzen Sie denselben englischen Schlüssel in allen Wörterbüchern. Fehlende Übersetzungen fallen auf Englisch zurück. Modellkennungen, Gewichte und Klassenreihenfolge bleiben unverändert; übersetzt werden nur angezeigte Texte.

## Veröffentlichung, Beteiligte und Lizenz

[**CNN Explainer: Learning Convolutional Neural Networks with Interactive Visualization**](https://arxiv.org/abs/2004.15004) — Zijie J. Wang, Robert Turko, Omar Shaikh, Haekyu Park, Nilaksh Das, Fred Hohman, Minsuk Kahng und Duen Horng Chau. *IEEE Transactions on Visualization and Computer Graphics (TVCG), 2020*.

Das Projekt entstand aus einer Zusammenarbeit zwischen Georgia Tech und Oregon State. Weitere Angaben finden Sie unter [Beteiligte und Danksagungen](README.md#credits) und [BibTeX-Zitat](README.md#citation). Die Software steht unter der [MIT-Lizenz](LICENSE). Fragen können Sie als [Issue](https://github.com/poloclub/cnn-explainer/issues/new/choose) stellen oder an [Jay Wang](https://zijie.wang/) richten.
