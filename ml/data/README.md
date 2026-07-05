# ml/data — Training & evaluation data  ·  Role 2

- `utterances.csv` — 300+ labelled utterances for intent/NER (text, intent, entities, lang)
- retail dataset / synthetic generator for the forecast model
- eval sets per model

Keep raw/large dumps out of git (they're covered by `.gitignore`); commit small
labelled CSVs and the generator scripts.
