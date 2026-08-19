# IQ Programming Practice

Python / Pyxel を用いたプログラミング演習環境です。

ブラウザ上でプログラムを作成・実行し、テストケースによる自動判定を行うことができます。

---

# 1. 基本的な使い方

## 1.1 必要なもの

利用するには以下の環境が必要です。

* Node.js
* Python 3
* Webブラウザ
* Git（リポジトリから取得する場合）

### Node.js

Node.js がインストールされていることを確認してください。

```bash
node --version
```

### Python

Python 3 がインストールされていることを確認してください。

```bash
python3 --version
```

---

## 1.2 ダウンロード

GitHubからリポジトリを取得します。

```bash
git clone <リポジトリURL>
cd iq
```

---

## 1.3 依存パッケージのインストール

プロジェクトのディレクトリで以下を実行します。

```bash
npm install
```

`package.json` に記載されている依存パッケージがインストールされます。

---

## 1.4 サーバーの起動

以下のコマンドを実行します。

```bash
node server.js
```

または、起動スクリプトを使用します。

```bash
./start.bash
```

正常に起動すると、以下のように表示されます。

```text
[ OK ] Server started
```

ブラウザから以下のURLにアクセスできます。

```text
http://localhost:3000/
http://localhost:3000/practice.html
```

---

## 1.5 ブラウザからアクセス

Webブラウザで以下のURLを開きます。

```text
http://localhost:3000/practice.html
```

---

## 1.6 名前の登録

初回アクセス時には、問題の進捗管理に使用する名前を登録します。

名前を入力して **「登録する」** を押してください。

登録が完了すると、学生IDが発行されます。

学生IDは問題の進捗管理に使用されます。

---

## 1.7 問題を解く

問題一覧から解きたい問題を選択します。

問題ページでは、以下の情報が表示されます。

* 問題文
* サンプルテストケース
* プログラム入力欄
* 実行ボタン
* 実行結果

プログラムを入力して **「▶ 実行する」** を押してください。

---

## 1.8 プログラムの判定

入力したプログラムはサーバー上で実行され、用意されたテストケースによって自動的に判定されます。

### AC

すべてのテストケースに成功すると `AC` となります。

```text
AC
```

### WA

プログラムの実行には成功したものの、期待された結果と異なる場合は `WA` となります。

```text
WA
```

### ERROR

プログラムの実行中にエラーが発生した場合は `ERROR` となります。

```text
ERROR
```

---

## 1.9 進捗管理

問題を `AC` すると、その問題の進捗が記録されます。

ローカルでの進捗情報は以下のファイルに保存されます。

```text
progress.json
```

また、設定されている場合はGoogle SpreadsheetにもAC情報が記録されます。

---

## 1.10 CLIから利用する

ブラウザを使用せず、CLIから問題を判定することもできます。

例えば問題12を判定する場合、

```bash
./bin/iq excuse 12.py
```

と実行します。

この場合、`12.py` が問題12への提出プログラムとして扱われます。

---

## 1.11 CLIの実行結果

すべてのテストケースに成功すると、

```text
AC
```

と表示されます。

テストケースに失敗した場合は、失敗したテストケースなどの情報が表示されます。

---

# 2. ディレクトリ構成

基本的な利用方法を確認した後、ここからはシステムの構成や内部仕様について説明します。

```text
iq/
├── api/
├── bin/
│   └── iq
├── package-lock.json
├── package.json
├── practice.html
├── problems.json
├── progress.json
├── server.js
├── setting/
│   ├── iq_setting.json
│   └── runner_setting.json
├── solutions/
├── tests/
├── tests.json
└── start.bash
```

> `node_modules/` は `npm install` によって生成されるため、通常はGitで管理しません。

各ファイル・ディレクトリの詳細については後述します。

---

# 3. システム構成

IQ Programming Practice は、主に以下のコンポーネントから構成されています。

```text
┌──────────────────────┐
│      Browser         │
│    practice.html     │
└──────────┬───────────┘
           │ HTTP
           │
           ▼
┌──────────────────────┐
│   Node.js Server     │
│      server.js       │
│                      │
│  ・Webページ配信      │
│  ・API処理            │
│  ・ジャッジ            │
│  ・進捗管理            │
└───────┬──────────────┘
        │
        ├───────────────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Python       │  │ JSON Files   │
│ Judge        │  │              │
│              │  │ problems.json│
│ student.py   │  │ tests.json   │
└──────────────┘  │ progress.json│
                  └──────────────┘
        │
        ▼
┌──────────────────────┐
│ Google Apps Script   │
│                      │
│ Google Spreadsheet   │
└──────────────────────┘
```

基本的な処理の流れは以下の通りです。

```text
ブラウザ
  ↓
server.js
  ↓
問題・テストケースを読み込む
  ↓
学生のPythonコードを実行
  ↓
テストケースを判定
  ↓
AC / WA / ERROR
  ↓
ローカル進捗を更新
  ↓
ACの場合はGASへ通知
  ↓
Google Spreadsheetへ記録
```

---

# 4. 技術スタック

現在のシステムでは、以下の技術を使用しています。

| 技術                 | 用途           |
| ------------------ | ------------ |
| HTML               | 問題ページ・UI     |
| CSS                | UIのスタイル      |
| JavaScript         | ブラウザ側の処理     |
| Node.js            | サーバー・ジャッジ処理  |
| Express            | HTTPサーバー/API |
| Python             | 提出プログラムの実行   |
| JSON               | 問題・テスト・進捗データ |
| Google Apps Script | 学生の進捗管理      |
| Google Spreadsheet | 進捗の共有・管理     |
| Git                | ソースコード管理     |

ブラウザ側は基本的に標準HTML/CSS/JavaScriptで構成されており、フロントエンドフレームワークを必須とする構成ではありません。

---

# 5. 各ファイル・ディレクトリ

## 5.1 `server.js`

システムの中心となるNode.jsサーバーです。

主に以下の処理を担当します。

* `practice.html` の配信
* Web API
* 問題の読み込み
* テストケースの読み込み
* Pythonプログラムの実行
* ジャッジ
* ローカル進捗の更新
* GASへの進捗通知

---

## 5.2 `practice.html`

ブラウザ上で動作する演習画面です。

主に以下を担当します。

* 問題文の表示
* 問題一覧の表示
* プログラム入力
* 実行要求
* ジャッジ結果の表示
* AC状態の表示
* 学生情報の管理

ブラウザから直接Pythonを実行するのではなく、`server.js` のAPIへプログラムを送信します。

---

## 5.3 `problems.json`

問題文などの問題データを管理します。

問題IDをキーとして問題を管理します。

```json
{
  "tasks": {
    "12": {
      "title": "add関数を実装しよう"
    }
  }
}
```

---

## 5.4 `tests.json`

ジャッジに使用するテストケースを管理します。

例えば問題12の場合、

```json
{
  "tasks": {
    "12": {
      "tests": [
        [
          "result = add(1, 2)",
          "@ result == 3"
        ],
        [
          "result = add(10, 20)",
          "@ result == 30"
        ]
      ]
    }
  }
}
```

という形式で定義します。

テストケースは、

```text
[実行するコード, 判定条件]
```

の組として扱います。

---

## 5.5 `progress.json`

ローカルでの学生の進捗を保存します。

問題をACすると、その問題の進捗が更新されます。

---

## 5.6 `setting/`

各種設定ファイルを格納します。

```text
setting/
├── iq_setting.json
└── runner_setting.json
```

`iq_setting.json` はIQ Programming Practice本体の設定、`runner_setting.json` はプログラム実行環境に関する設定を管理します。

---

## 5.7 `bin/iq`

CLIからジャッジを実行するためのエントリーポイントです。

例えば、

```bash
./bin/iq excuse 12.py
```

と実行すると、`12.py` を問題12への提出としてジャッジします。

---

# 6. Webジャッジ

Web版のジャッジでは、ブラウザから以下のAPIへリクエストを送信します。

```http
POST /api/submit
```

リクエスト例：

```json
{
  "task_id": 12,
  "language": "python",
  "code": "def add(a, b):\n    return a + b"
}
```

---

## 6.1 `/api/submit` の処理

`server.js` では、概ね以下の順番で処理します。

```text
1. task_idを取得
       ↓
2. languageを確認
       ↓
3. 提出コードを取得
       ↓
4. 問題の存在を確認
       ↓
5. Pythonジャッジを実行
       ↓
6. AC / WA / ERRORを判定
       ↓
7. ACなら進捗を更新
       ↓
8. GASへACを通知
       ↓
9. ブラウザへ結果を返す
```

---

# 7. ジャッジ処理

Pythonの提出コードは、ジャッジ処理によって実行されます。

現在のWebジャッジではPythonを対象としています。

```text
提出コード
    ↓
student.py
    ↓
テストコードを実行
    ↓
期待される結果と比較
    ↓
AC / WA / ERROR
```

Web版では、問題番号を `task_id` として扱います。

例えば、

```text
task_id = 12
```

の場合、

```text
問題12
```

のテストケースを使用します。

---

# 8. `student.py`

提出されたPythonコードは、ジャッジ実行時に学生プログラムとして扱われます。

基本的には、

```python
def add(a, b):
    return a + b
```

のような関数を実装することを想定しています。

テストケース側から、

```python
result = add(1, 2)
```

のように学生が実装した関数を呼び出します。

---

# 9. クラスを使用する問題

問題によっては、関数ではなくクラスの実装を要求できます。

例えば、

```python
class Player:
    def __init__(self, x, y):
        self.x = x
        self.y = y
```

のようなコードを学生に実装させる場合、テスト側では学生コードを読み込んだ上で、

```python
player = Player(10, 20)
result = player.x
```

のようにインスタンスを生成してテストします。

したがって、問題設計時には、

### 関数問題

```text
関数問題
    ↓
student.py
    ↓
関数を呼び出してテスト
```

### クラス問題

```text
クラス問題
    ↓
student.py
    ↓
クラスをimport
    ↓
インスタンスを生成
    ↓
メソッド・属性をテスト
```

という構造になります。

---

# 10. CLIジャッジ

CLIでは、

```bash
./bin/iq excuse 12.py
```

のように実行します。

ファイル名から問題番号を取得します。

```text
12.py
 ↓
basename = 12
 ↓
task_id = 12
```

現在のCLIでは、Pythonファイルであることを確認し、ファイル名が数字だけで構成されていることを要求します。

例えば、

```text
12.py
34.py
100.py
```

は有効ですが、

```text
answer.py
task12.py
12.cpp
```

は現在の形式では対象外です。

---

# 11. 問題ID

問題IDはシステム全体で一貫して使用します。

例えば問題12の場合、

```text
task_id = 12
```

として扱います。

以下の処理で同じIDを使用します。

```text
problems.json
      ↓
tests.json
      ↓
server.js
      ↓
judgePython()
      ↓
progress.json
      ↓
GAS
```

問題IDとファイル名を別々に管理すると不整合が発生しやすいため、原則として問題番号を共通の識別子として使用します。

---

# 12. 進捗管理

ACした場合、まずローカルの進捗を更新します。

```javascript
updateProgressAC(taskId);
```

その後、GASへAC情報を送信します。

```json
{
  "action": "ac",
  "student_id": "xxxxxxxx",
  "task_id": 12,
  "status": "AC"
}
```

GAS側では、

```text
student_id
    ↓
学生の行を検索
    ↓
task_id
    ↓
対象列を決定
    ↓
status = AC
    ↓
セルにACを書き込む
```

という処理を行います。

---

# 13. Google Spreadsheet

進捗管理用Spreadsheetでは、基本的に以下の構造を使用します。

```text
A列       B列             C列以降
学生名    Student ID      問題の進捗
```

例えば、

```text
A          B             C       D       E ...
学生名     Student ID    ...     ...     ...

hoge       xxxxxxxx      AC      AC
```

という構成になります。

現在の設計では、`task_id` を列番号として使用します。

例えば、

```text
task_id = 12
```

なら、

```text
12列目 = L列
```

にACを書き込みます。

この方式では、GAS側に問題一覧を別途登録する必要がありません。

---

# 14. GASとの通信

Node.jsからGASへHTTP POSTでデータを送信します。

```javascript
await gasRequest({
    action: "ac",
    student_id: setting.student.id,
    task_id: Number(taskId),
    status: "AC"
});
```

GASからはJSON形式で結果が返されます。

成功時：

```json
{
  "success": true,
  "task_id": 12,
  "status": "AC"
}
```

GAS側でエラーが発生した場合でも、ローカル側のAC判定そのものは取り消しません。

これは、

```text
ジャッジ
    ↓
AC
    ↓
ローカル進捗更新
    ↓
GAS通信
```

という順序にすることで実現しています。

GASが一時的に利用できなくても、ジャッジ結果そのものを失わないことを目的としています。

---

# 15. API

現在の主なAPIは以下です。

| Method | Endpoint         | 用途      |
| ------ | ---------------- | ------- |
| GET    | `/`              | サーバー確認  |
| GET    | `/practice.html` | 演習ページ   |
| POST   | `/api/submit`    | プログラム提出 |

---

## 15.1 `/api/submit`

### Request

```json
{
  "task_id": 12,
  "language": "python",
  "code": "def add(a, b):\n    return a + b"
}
```

### AC

```json
{
  "type": "AC",
  "task_id": "12",
  "tests": []
}
```

### WA

```json
{
  "type": "WA",
  "test": {},
  "tests": []
}
```

### ERROR

```json
{
  "type": "ERROR",
  "test": {},
  "summary": "...",
  "stderr": "...",
  "stdout": "..."
}
```

---

# 16. セキュリティ上の注意

このシステムでは、学生が入力したPythonコードをサーバー上で実行します。

したがって、ジャッジサーバーは**任意コード実行環境**になります。

例えばPythonコードから、

```python
import os
```

などを使用してOS上のリソースへアクセスできる可能性があります。

そのため、現在のシステムは基本的に、

```text
信頼できる利用者
+
管理されたローカル環境
```

での利用を想定します。

インターネット上にそのまま公開する場合は、サンドボックス化やコンテナ分離などの対策が必要です。

---

# 17. 問題を追加する

新しい問題を追加する場合は、少なくとも以下を更新します。

```text
problems.json
tests.json
```

例えば問題12を追加する場合、

```json
{
  "tasks": {
    "12": {
      "tests": [
        [
          "result = add(1, 2)",
          "@ result == 3"
        ]
      ]
    }
  }
}
```

のようにテストケースを定義します。

問題文などの表示情報は `problems.json`、ジャッジに必要な情報は `tests.json` に分離して管理します。

---

# 18. 開発時の基本フロー

開発時は以下の流れを基本とします。

```text
コードを変更
    ↓
server.jsを再起動
    ↓
ブラウザで動作確認
    ↓
CLIでも必要に応じて確認
    ↓
テストケースを確認
    ↓
Git commit
    ↓
Git push
```

サーバーを起動しているターミナルでは、ジャッジ時のログを確認できます。

例えば、

```text
[INFO] Judge start: task=12
```

のようなログが表示されます。

GAS通信を行う場合は、

```text
[GAS REQUEST] ...
[GAS STATUS] ...
[GAS RESPONSE] ...
```

などのログも確認できます。

---

# 19. 開発者向け補足

本システムでは、ブラウザ上のUIからの操作だけでなく、CLIやWeb APIを通してジャッジシステムを利用できます。

そのため、機能を追加・変更する際には、以下の複数の経路に影響がないか確認する必要があります。

```text
ブラウザ
    ↓
Web API
    ↓
ジャッジ
    ↓
進捗管理
    ↓
GAS / Spreadsheet
```

また、

```text
CLI
    ↓
ジャッジ
    ↓
進捗管理
```

という経路も存在します。

特に問題IDの扱い、テストケースの形式、提出プログラムの実行方法を変更する場合は、Web版とCLI版の双方に影響する可能性があります。

---

# 20. まとめ

IQ Programming Practice は、Python / Pyxel のプログラミング演習を行うための環境です。

利用者は、

```text
サーバーを起動
    ↓
ブラウザを開く
    ↓
名前を登録
    ↓
問題を選択
    ↓
Pythonプログラムを入力
    ↓
実行
    ↓
AC / WA / ERRORを確認
```

という流れで問題に取り組むことができます。

また、CLIから直接問題を判定することもできます。

システム内部では、

```text
Browser
    ↓
Node.js / Express
    ↓
Python Judge
    ↓
Test Cases
    ↓
AC / WA / ERROR
    ↓
Progress
    ↓
Google Apps Script
    ↓
Google Spreadsheet
```

という構成で、問題の出題・ジャッジ・進捗管理を行っています。

なお、提出されたPythonコードをサーバー上で実行するという性質上、信頼できない利用者に対して公開する場合には、適切なサンドボックス化・リソース制限・プロセス分離などのセキュリティ対策が必要です。
