"use strict";

/*
 * ============================================================
 * IQ Programming Practice
 * Local Practice Server
 * ============================================================
 *
 * Directory:
 *
 * iq/
 * ├── api/
 * ├── bin/
 * │   └── iq
 * ├── package.json
 * ├── practice.html
 * ├── problems.json
 * ├── progress.json
 * ├── server.js
 * ├── setting/
 * │   ├── iq_setting.json
 * │   └── runner_setting.json
 * ├── solutions/
 * ├── start.bash
 * ├── tests/
 * └── tests.json
 *
 *
 * Browser
 *    ↓
 * server.js
 *    ├── problems.json
 *    ├── tests.json
 *    ├── progress.json
 *    ├── setting/iq_setting.json
 *    └── GAS
 *         ↓
 *      Spreadsheet
 *
 * ============================================================
 */


// ============================================================
// Modules
// ============================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const {
    spawn,
    spawnSync,
    execFile
} = require("child_process");


// ============================================================
// Express
// ============================================================

const app = express();

app.use(
    express.json({
        limit: "2mb"
    })
);


// ============================================================
// Configuration
// ============================================================

const ROOT_DIR = __dirname;

const PORT = 3000;

const HOST = "127.0.0.1";


const PROBLEMS_FILE = path.join(
    ROOT_DIR,
    "problems.json"
);


const TESTS_FILE = path.join(
    ROOT_DIR,
    "tests.json"
);


const PROGRESS_FILE = path.join(
    ROOT_DIR,
    "progress.json"
);


const SETTING_DIR = path.join(
    ROOT_DIR,
    "setting"
);


const SETTING_FILE = path.join(
    SETTING_DIR,
    "iq_setting.json"
);


const RUNNER_SETTING_FILE = path.join(
    SETTING_DIR,
    "runner_setting.json"
);


const SOLUTIONS_DIR = path.join(
    ROOT_DIR,
    "solutions"
);


const PRACTICE_HTML = path.join(
    ROOT_DIR,
    "practice.html"
);


/*
 * 現在使用しているGAS Web App
 */
const GAS_URL =
    "https://script.google.com/macros/s/AKfycby7W0xOKWF0sE8jC_ijkcBWiHhhB_T0I4e5-Bbrsb8-wk8tQcNcJiNXQrDvBdvP9ViX/exec";


/*
 * プログラム実行制限
 */
const EXEC_TIMEOUT_MS = 5000;


/*
 * stdout / stderr の最大サイズ
 */
const MAX_OUTPUT_SIZE = 1024 * 1024;


// ============================================================
// Initialization
// ============================================================

function ensureDirectories() {

    fs.mkdirSync(
        SETTING_DIR,
        {
            recursive: true
        }
    );

    fs.mkdirSync(
        SOLUTIONS_DIR,
        {
            recursive: true
        }
    );
}


ensureDirectories();


// ============================================================
// Logging
// ============================================================

function log(message) {
    console.log(
        `[INFO] ${message}`
    );
}


function logError(message) {
    console.error(
        `[ERROR] ${message}`
    );
}


// ============================================================
// JSON utilities
// ============================================================

function readJSON(filePath) {

    if (!fs.existsSync(filePath)) {
        throw new Error(
            `ファイルが見つかりません: ${filePath}`
        );
    }

    const text =
        fs.readFileSync(
            filePath,
            "utf8"
        );

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(
            `JSONの解析に失敗しました: ${path.basename(filePath)}\n` +
            error.message
        );
    }
}


function writeJSON(
    filePath,
    data
) {

    fs.mkdirSync(
        path.dirname(filePath),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            2
        ) + "\n",
        "utf8"
    );
}


// ============================================================
// Setting
// ============================================================

/*
 * iq_setting.json
 *
 * {
 *   "student": {
 *     "name": "hoge",
 *     "id": "xxxxxxxx",
 *     "row": 5
 *   }
 * }
 */

function loadSetting() {

    if (!fs.existsSync(SETTING_FILE)) {
        return null;
    }

    try {

        const data =
            readJSON(
                SETTING_FILE
            );

        /*
         * 旧形式にも多少寛容にする
         */
        if (
            data.student &&
            data.student.name &&
            data.student.id
        ) {
            return data;
        }

        if (
            data.name &&
            data.student_id
        ) {
            return {
                student: {
                    name: data.name,
                    id: data.student_id,
                    row: data.row ?? null
                }
            };
        }

        return null;

    } catch (error) {

        logError(
            `iq_setting.json: ${error.message}`
        );

        return null;
    }
}


function saveSetting(
    student
) {

    writeJSON(
        SETTING_FILE,
        {
            student: {
                name: student.name,
                id: student.id,
                row: student.row ?? null
            }
        }
    );
}


function isRegistered() {

    return loadSetting() !== null;
}


// ============================================================
// Progress
// ============================================================

function loadProgress() {

    if (!fs.existsSync(PROGRESS_FILE)) {

        return {
            student: {
                name: "",
                id: ""
            },
            tasks: {}
        };
    }

    const progress =
        readJSON(
            PROGRESS_FILE
        );

    if (!progress.tasks) {
        progress.tasks = {};
    }

    if (!progress.student) {
        progress.student = {
            name: "",
            id: ""
        };
    }

    return progress;
}


function saveProgress(
    progress
) {

    writeJSON(
        PROGRESS_FILE,
        progress
    );
}


function initializeProgress(
    student
) {

    const current =
        loadProgress();

    current.student = {
        name: student.name,
        id: student.id
    };

    if (!current.tasks) {
        current.tasks = {};
    }

    saveProgress(
        current
    );
}


function updateProgressAC(
    taskId
) {

    const progress =
        loadProgress();

    const setting =
        loadSetting();

    if (setting) {
        progress.student = {
            name:
                setting.student.name,
            id:
                setting.student.id
        };
    }

    if (!progress.tasks) {
        progress.tasks = {};
    }

    progress.tasks[
        String(taskId)
    ] = {
        status: "AC",
        updated_at:
            new Date().toISOString()
    };

    saveProgress(
        progress
    );
}


// ============================================================
// Error summary
// ============================================================

function summarizePythonError(
    stderr
) {

    const text =
        String(stderr || "");

    if (
        text.includes("SyntaxError")
    ) {
        return (
            "Pythonの文法に誤りがあります。"
        );
    }

    if (
        text.includes("IndentationError")
    ) {
        return (
            "インデントに誤りがあります。"
        );
    }

    if (
        text.includes("TabError")
    ) {
        return (
            "タブとスペースによるインデントが混在しています。"
        );
    }

    if (
        text.includes("ModuleNotFoundError")
    ) {

        const match =
            text.match(
                /No module named ['"]([^'"]+)['"]/
            );

        if (match) {
            return (
                `Pythonモジュール「${match[1]}」が見つかりません。`
            );
        }

        return (
            "必要なPythonモジュールが見つかりません。"
        );
    }

    if (
        text.includes("ImportError")
    ) {
        return (
            "Pythonモジュールの読み込みに失敗しました。"
        );
    }

    if (
        text.includes("NameError")
    ) {
        return (
            "定義されていない変数・関数・クラスを使用しています。"
        );
    }

    if (
        text.includes("AttributeError")
    ) {
        return (
            "存在しない属性・メソッドを使用しています。"
        );
    }

    if (
        text.includes("TypeError")
    ) {
        return (
            "関数や演算に渡している値の型・引数が正しくありません。"
        );
    }

    if (
        text.includes("ValueError")
    ) {
        return (
            "値の形式または内容が正しくありません。"
        );
    }

    if (
        text.includes("IndexError")
    ) {
        return (
            "リストなどの範囲外のインデックスにアクセスしています。"
        );
    }

    if (
        text.includes("KeyError")
    ) {
        return (
            "存在しない辞書のキーにアクセスしています。"
        );
    }

    if (
        text.includes("ZeroDivisionError")
    ) {
        return (
            "0による除算が発生しました。"
        );
    }

    if (
        text.includes("RecursionError")
    ) {
        return (
            "再帰呼び出しが深すぎます。終了条件を確認してください。"
        );
    }

    return (
        "Pythonプログラムの実行中にエラーが発生しました。"
    );
}


function summarizeGeneralError(
    error
) {

    const message =
        error instanceof Error
            ? error.message
            : String(error);

    return message;
}


// ============================================================
// GAS communication
// ============================================================

async function gasRequest(data) {

    console.log(
        "[GAS REQUEST]",
        JSON.stringify(data)
    );


    const response =
        await fetch(
            GAS_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data),

                redirect: "follow"
            }
        );


    const text =
        await response.text();


    console.log(
        "[GAS STATUS]",
        response.status
    );


    console.log(
        "[GAS RESPONSE]",
        text
    );


    if (!response.ok) {

        throw new Error(
            `GAS HTTP error: ${response.status}`
        );
    }


    let result;

    try {

        result =
            JSON.parse(text);

    } catch (error) {

        throw new Error(
            "GASからJSONではない応答が返されました: " +
            text
        );
    }


    if (!result.success) {

        throw new Error(
            result.error ||
            result.message ||
            "GAS側で処理に失敗しました。"
        );
    }


    return result;
}


// ============================================================
// API: Setting
// ============================================================

app.get(
    "/api/setting",
    (req, res) => {

        try {

            const setting =
                loadSetting();


            if (!setting) {

                return res.json({
                    configured: false
                });
            }


            return res.json({

                configured: true,

                name:
                    setting.student.name,

                student:
                    setting.student

            });

        } catch (error) {

            logError(
                error.stack ||
                error.message
            );

            return res.status(500).json({

                configured: false,

                error:
                    summarizeGeneralError(
                        error
                    )

            });
        }
    }
);


// ============================================================
// API: Status
// ============================================================

app.get(
    "/api/status",
    (req, res) => {

        return res.json({
            success: true,
            status: "online",
            registered:
                isRegistered()
        });
    }
);


// ============================================================
// API: makeid
// ============================================================

app.post(
    "/api/makeid",
    async (req, res) => {

        try {

            const name =
                String(
                    req.body?.name || ""
                ).trim();


            if (!name) {

                return res.status(400).json({
                    success: false,
                    error:
                        "名前を入力してください。"
                });
            }


            if (name.length > 50) {

                return res.status(400).json({
                    success: false,
                    error:
                        "名前は50文字以内にしてください。"
                });
            }


            /*
             * ------------------------------------------------
             * 既に登録済みならGASへ送らない
             * ------------------------------------------------
             */

            const existing =
                loadSetting();


            if (existing) {

                log(
                    `既存ユーザーを使用: ${existing.student.name}`
                );


                return res.json({

                    success: true,

                    already_registered:
                        true,

                    name:
                        existing.student.name,

                    student:
                        existing.student

                });
            }


            /*
             * ------------------------------------------------
             * Student ID生成
             * ------------------------------------------------
             */

            const studentId =
                crypto.randomUUID();


            log(
                `学生登録開始: ${name}`
            );


            /*
             * ------------------------------------------------
             * GAS登録
             * ------------------------------------------------
             */

            let gasResult;


            try {

                gasResult =
                    await gasRequest({
                        action: "makeid",

                        name: name,

                        student_id:
                            studentId
                    });

            } catch (error) {

                logError(
                    error.message
                );


                return res.status(502).json({

                    success: false,

                    error:
                        error.message

                });
            }


            /*
             * ------------------------------------------------
             * GAS側で失敗
             * ------------------------------------------------
             */

            if (
                !gasResult ||
                !gasResult.success
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        gasResult?.error ||
                        "GASへの登録に失敗しました。"

                });
            }


            /*
             * ------------------------------------------------
             * GAS成功
             *
             * ここで初めてローカル保存
             * ------------------------------------------------
             */

            const student = {

                name:
                    name,

                id:
                    studentId,

                row:
                    gasResult.row ??
                    null
            };


            saveSetting(
                student
            );


            initializeProgress(
                student
            );


            log(
                `学生登録完了: ${name}`
            );


            return res.json({

                success: true,

                already_registered:
                    false,

                name:
                    name,

                student:
                    student
            });


        } catch (error) {

            logError(
                error.stack ||
                error.message
            );


            return res.status(500).json({

                success: false,

                error:
                    summarizeGeneralError(
                        error
                    )

            });
        }
    }
);


// ============================================================
// API: Problems
// ============================================================

app.get(
    "/api/problems",
    (req, res) => {

        try {

            const problems =
                readJSON(
                    PROBLEMS_FILE
                );


            /*
             * practice.html は
             *
             * const data = await getJSON("/api/problems");
             * problems = data.tasks || {};
             *
             * を期待している。
             *
             * したがって tasks を直接返す。
             */

            return res.json(
                problems
            );

        } catch (error) {

            logError(
                error.stack ||
                error.message
            );


            return res.status(500).json({

                success: false,

                error:
                    summarizeGeneralError(
                        error
                    )

            });
        }
    }
);


// ============================================================
// API: Progress
// ============================================================

app.get(
    "/api/progress",
    (req, res) => {

        try {

            return res.json(
                loadProgress()
            );

        } catch (error) {

            logError(
                error.stack ||
                error.message
            );


            return res.status(500).json({

                success: false,

                error:
                    summarizeGeneralError(
                        error
                    )

            });
        }
    }
);


// ============================================================
// Tests
// ============================================================

function getTaskTests(
    taskId
) {

    const tests =
        readJSON(
            TESTS_FILE
        );


    if (
        !tests.tasks
    ) {

        throw new Error(
            "tests.json に tasks がありません。"
        );
    }


    const task =
        tests.tasks[
            String(taskId)
        ];


    if (!task) {

        throw new Error(
            `問題 ${taskId} のテストケースが設定されていません。`
        );
    }


    if (
        !Array.isArray(
            task.tests
        )
    ) {

        throw new Error(
            `問題 ${taskId} の tests が配列ではありません。`
        );
    }


    if (
        task.tests.length === 0
    ) {

        throw new Error(
            `問題 ${taskId} にテストケースがありません。`
        );
    }


    return task.tests;
}


// ============================================================
// Test line parsing
// ============================================================

function parseTestLine(
    line
) {

    const original =
        String(line);


    const trimmed =
        original.trimStart();


    /*
     * @ expression
     */
    if (
        trimmed.startsWith("@")
    ) {

        const expression =
            trimmed
                .slice(1)
                .trim();


        if (!expression) {

            throw new Error(
                "@ の後に判定式がありません。"
            );
        }


        return {

            check: true,

            expression:
                expression,

            source:
                `print("__IQ_RESULT__:" + str(bool(${expression})))`

        };
    }


    return {

        check: false,

        expression: null,

        source:
            original

    };
}


// ============================================================
// Test runner source
// ============================================================

function buildTestSource(
    testCase
) {

    const lines = [
        "import student",
        ""
    ];


    for (
        const line of testCase
    ) {

        const parsed =
            parseTestLine(
                line
            );


        lines.push(
            parsed.source
        );
    }


    return (
        lines.join("\n") +
        "\n"
    );
}


// ============================================================
// Run Python process
// ============================================================

function runPython(
    source,
    workingDirectory
) {

    return new Promise(
        resolve => {

            const child =
                spawn(
                    "python3",
                    [
                        "-c",
                        source
                    ],
                    {
                        cwd:
                            workingDirectory,

                        env: {
                            ...process.env,

                            PYTHONUNBUFFERED:
                                "1"
                        },

                        stdio: [
                            "ignore",
                            "pipe",
                            "pipe"
                        ]
                    }
                );


            let stdout = "";
            let stderr = "";

            let finished = false;


            child.stdout.on(
                "data",
                data => {

                    if (
                        stdout.length <
                        MAX_OUTPUT_SIZE
                    ) {

                        stdout +=
                            data.toString();
                    }
                }
            );


            child.stderr.on(
                "data",
                data => {

                    if (
                        stderr.length <
                        MAX_OUTPUT_SIZE
                    ) {

                        stderr +=
                            data.toString();
                    }
                }
            );


            const timer =
                setTimeout(
                    () => {

                        if (finished) {
                            return;
                        }

                        finished = true;

                        child.kill(
                            "SIGKILL"
                        );


                        resolve({
                            type: "TLE",

                            stdout:
                                stdout,

                            stderr:
                                stderr
                        });

                    },
                    EXEC_TIMEOUT_MS
                );


            child.on(
                "error",
                error => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    clearTimeout(
                        timer
                    );


                    if (
                        error.code === "ENOENT"
                    ) {

                        resolve({

                            type: "ERROR",

                            summary:
                                "Python3 がインストールされていないか、PATHに存在しません。",

                            stdout:
                                stdout,

                            stderr:
                                stderr
                        });

                        return;
                    }


                    resolve({

                        type: "ERROR",

                        summary:
                            "Pythonプログラムの起動に失敗しました。",

                        stdout:
                            stdout,

                        stderr:
                            error.message
                    });

                }
            );


            child.on(
                "close",
                code => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    clearTimeout(
                        timer
                    );


                    /*
                     * 標準エラーがあればERROR。
                     *
                     * 今回の仕様に合わせる。
                     */

                    if (
                        stderr.trim() !== ""
                    ) {

                        resolve({

                            type: "ERROR",

                            summary:
                                summarizePythonError(
                                    stderr
                                ),

                            stdout:
                                stdout,

                            stderr:
                                stderr,

                            exitCode:
                                code
                        });

                        return;
                    }


                    if (
                        code !== 0
                    ) {

                        resolve({

                            type: "ERROR",

                            summary:
                                summarizePythonError(
                                    stderr
                                ),

                            stdout:
                                stdout,

                            stderr:
                                stderr,

                            exitCode:
                                code
                        });

                        return;
                    }


                    resolve({

                        type: "OK",

                        stdout:
                            stdout,

                        stderr:
                            stderr,

                        exitCode:
                            code
                    });

                }
            );
        }
    );
}


// ============================================================
// Judge one test case
// ============================================================

async function judgeTestCase(
    testCase
) {

    /*
     * テストケースごとに完全に別の
     * temporary directoryを作る。
     *
     * 変数状態を次のテストケースへ持ち越さない。
     */

    const tempDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "iq-practice-"
            )
        );


    try {

        const studentFile =
            path.join(
                tempDir,
                "student.py"
            );


        /*
         * studentCodeは呼び出し元で
         * tempDirへ配置済みにする。
         */
        if (
            !fs.existsSync(
                studentFile
            )
        ) {

            throw new Error(
                "student.py が一時実行環境に存在しません。"
            );
        }


        const source =
            buildTestSource(
                testCase
            );


        const execution =
            await runPython(
                source,
                tempDir
            );


        if (
            execution.type !== "OK"
        ) {

            return {

                status:
                    execution.type,

                summary:
                    execution.summary,

                stdout:
                    execution.stdout,

                stderr:
                    execution.stderr

            };
        }


        /*
         * @ の行だけ抽出
         */

        const checks =
            testCase
                .map(
                    line =>
                        parseTestLine(
                            line
                        )
                )
                .filter(
                    item =>
                        item.check
                );


        const markerLines =
            execution.stdout
                .split(/\r?\n/)
                .filter(
                    line =>
                        line.startsWith(
                            "__IQ_RESULT__:"
                        )
                );


        /*
         * @ の数と結果数が一致する必要がある。
         */

        if (
            markerLines.length !==
            checks.length
        ) {

            return {

                status:
                    "ERROR",

                summary:
                    "テスト結果の数が一致しません。",

                stdout:
                    execution.stdout,

                stderr:
                    execution.stderr

            };
        }


        const results = [];


        for (
            let i = 0;
            i < checks.length;
            i++
        ) {

            const marker =
                markerLines[i];


            const value =
                marker
                    .slice(
                        "__IQ_RESULT__:".length
                    )
                    .trim();


            if (
                value !== "True" &&
                value !== "False"
            ) {

                return {

                    status:
                        "ERROR",

                    summary:
                        "テスト結果を正しく解析できませんでした。",

                    stdout:
                        execution.stdout,

                    stderr:
                        execution.stderr

                };
            }


            results.push({

                code:
                    checks[i].expression,

                result:
                    value === "True"

            });
        }


        const failed =
            results.find(
                item =>
                    item.result === false
            );


        /*
         * AC
         */

        if (!failed) {

            return {

                status:
                    "AC",

                results:
                    results

            };
        }


        /*
         * WA
         */

        return {

            status:
                "WA",

            results:
                results

        };

    } finally {

        fs.rmSync(
            tempDir,
            {
                recursive: true,
                force: true
            }
        );
    }
}


// ============================================================
// Judge Python
// ============================================================

async function judgePython(
    code,
    taskId
) {

    const testCases =
        getTaskTests(
            taskId
        );


    const allResults = [];


    /*
     * テストケースごとに独立実行。
     */
    for (
        let i = 0;
        i < testCases.length;
        i++
    ) {

        const testCase =
            testCases[i];


        if (
            !Array.isArray(
                testCase
            )
        ) {

            return {

                status:
                    "ERROR",

                summary:
                    `Test Case ${i + 1} が配列ではありません。`

            };
        }


        /*
         * 各テスト用一時ディレクトリ
         */

        const tempDir =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "iq-judge-"
                )
            );


        try {

            const studentFile =
                path.join(
                    tempDir,
                    "student.py"
                );


            fs.writeFileSync(
                studentFile,
                code,
                "utf8"
            );


            const source =
                buildTestSource(
                    testCase
                );


            const execution =
                await runPython(
                    source,
                    tempDir
                );


            /*
             * ERROR / TLE
             */

            if (
                execution.type ===
                "ERROR" ||
                execution.type ===
                "TLE"
            ) {

                return {

                    status:
                        "ERROR",

                    test:
                        i + 1,

                    summary:
                        execution.summary ||
                        (
                            execution.type ===
                            "TLE"
                                ? "実行時間制限を超えました。"
                                : "プログラム実行中にエラーが発生しました。"
                        ),

                    stderr:
                        execution.stderr || "",

                    stdout:
                        execution.stdout || ""

                };
            }


            /*
             * @判定
             */

            const checks =
                testCase
                    .map(
                        line =>
                            parseTestLine(
                                line
                            )
                    )
                    .filter(
                        item =>
                            item.check
                    );


            const markerLines =
                execution.stdout
                    .split(/\r?\n/)
                    .filter(
                        line =>
                            line.startsWith(
                                "__IQ_RESULT__:"
                            )
                    );


            if (
                markerLines.length !==
                checks.length
            ) {

                return {

                    status:
                        "ERROR",

                    test:
                        i + 1,

                    summary:
                        "テスト結果の数が一致しません。",

                    stdout:
                        execution.stdout,

                    stderr:
                        execution.stderr

                };
            }


            const results = [];


            for (
                let j = 0;
                j < checks.length;
                j++
            ) {

                const marker =
                    markerLines[j];


                const value =
                    marker
                        .slice(
                            "__IQ_RESULT__:".length
                        )
                        .trim();


                if (
                    value !== "True" &&
                    value !== "False"
                ) {

                    return {

                        status:
                            "ERROR",

                        test:
                            i + 1,

                        summary:
                            "テスト結果を正しく解析できませんでした。",

                        stdout:
                            execution.stdout,

                        stderr:
                            execution.stderr

                    };
                }


                results.push({

                    code:
                        checks[j].expression,

                    result:
                        value === "True",

                    output:
                        value

                });
            }


            const testResult = {

                test:
                    i + 1,

                status:
                    results.every(
                        item =>
                            item.result
                    )
                        ? "AC"
                        : "WA",

                results:
                    results

            };


            allResults.push(
                testResult
            );


            /*
             * 最初のWAで終了
             */

            if (
                testResult.status ===
                "WA"
            ) {

                return {

                    status:
                        "WA",

                    test:
                        i + 1,

                    tests:
                        allResults

                };
            }

        } finally {

            fs.rmSync(
                tempDir,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }


    /*
     * 全テスト成功
     */

    return {

        status:
            "AC",

        tests:
            allResults,

        task_id:
            String(taskId)

    };
}


// ============================================================
// API: Submit
// ============================================================

app.post(
    "/api/submit",
    async (req, res) => {

        try {

            // --------------------------------------------------
            // リクエスト取得
            // --------------------------------------------------

            const taskId =
                String(
                    req.body?.task_id ?? ""
                ).trim();

            const language =
                String(
                    req.body?.language ?? ""
                ).trim();

            const code =
                String(
                    req.body?.code ?? ""
                );


            // --------------------------------------------------
            // 入力チェック
            // --------------------------------------------------

            if (
                !/^\d+$/.test(taskId)
            ) {

                return res.status(400).json({

                    type: "ERROR",

                    message:
                        "問題番号が不正です。"

                });
            }


            if (!code.trim()) {

                return res.status(400).json({

                    type: "ERROR",

                    message:
                        "プログラムを入力してください。"

                });
            }


            // --------------------------------------------------
            // 現在Web版はPythonのみ
            // --------------------------------------------------

            if (
                language !== "python"
            ) {

                return res.status(400).json({

                    type: "ERROR",

                    message:
                        "現在のWebジャッジはPythonにのみ対応しています。"

                });
            }


            // --------------------------------------------------
            // 問題存在確認
            // --------------------------------------------------

            const problems =
                readJSON(
                    PROBLEMS_FILE
                );


            if (
                !problems.tasks ||
                !problems.tasks[taskId]
            ) {

                return res.status(404).json({

                    type: "ERROR",

                    message:
                        `問題 ${taskId} が存在しません。`

                });
            }


            log(
                `Judge start: task=${taskId}`
            );


            // --------------------------------------------------
            // Pythonジャッジ
            // --------------------------------------------------

            const result =
                await judgePython(
                    code,
                    taskId
                );


            // ==================================================
            // ERROR
            // ==================================================

            if (
                result.status ===
                "ERROR"
            ) {

                return res.json({

                    type:
                        "ERROR",

                    test:
                        result.test,

                    summary:
                        result.summary,

                    stderr:
                        result.stderr,

                    stdout:
                        result.stdout

                });
            }


            // ==================================================
            // WA
            // ==================================================

            if (
                result.status ===
                "WA"
            ) {

                return res.json({

                    type:
                        "WA",

                    test:
                        result.test,

                    tests:
                        result.tests

                });
            }


            // ==================================================
            // AC
            // ==================================================

            if (
                result.status ===
                "AC"
            ) {

                // ------------------------------------------------
                // GASへAC通知
                //
                // task_id = 問題番号
                //
                // 例:
                // task_id = 12
                //
                // GAS側では12列目にACを書く。
                // ------------------------------------------------

                const setting =
                    loadSetting();


                let gasResult =
                    null;


                if (
                    !setting ||
                    !setting.student ||
                    !setting.student.id
                ) {

                    logError(
                        "GAS登録情報がありません。"
                    );


                    return res.status(500).json({

                        type:
                            "ERROR",

                        message:
                            "学生情報が登録されていません。"

                    });
                }


                try {

                    gasResult =
                        await gasRequest({

                            action:
                                "ac",

                            student_id:
                                String(
                                    setting.student.id
                                ).trim(),

                            task_id:
                                Number(taskId),

                            status:
                                "AC"

                        });


                    // --------------------------------------------
                    // GASへの書き込み成功
                    //
                    // ここで初めてローカル進捗をACにする
                    // --------------------------------------------

                    updateProgressAC(
                        taskId
                    );


                    log(
                        `GAS AC登録成功: task=${taskId}`
                    );


                } catch (error) {

                    // --------------------------------------------
                    // GAS失敗
                    //
                    // HTMLにはACを返さない
                    // --------------------------------------------

                    logError(
                        `ACのGAS送信に失敗しました: ${error.message}`
                    );


                    return res.status(500).json({

                        type:
                            "ERROR",

                        message:
                            "スプレッドシートへのAC登録に失敗しました。",

                        stderr:
                            error.message

                    });
                }


                // ------------------------------------------------
                // GAS登録成功後にHTMLへACを返す
                // ------------------------------------------------

                return res.json({

                    type:
                        "AC",

                    task_id:
                        taskId,

                    tests:
                        result.tests,

                    gas:
                        gasResult

                });
            }


            // ==================================================
            // 想定外
            // ==================================================

            return res.json({

                type:
                    "ERROR",

                message:
                    "不明なジャッジ結果です。"

            });


        } catch (error) {

            logError(
                error.stack ||
                error.message
            );


            return res.status(500).json({

                type:
                    "ERROR",

                summary:
                    summarizeGeneralError(
                        error
                    ),

                stderr:
                    error.stack ||
                    error.message

            });
        }
    }
);

// ============================================================
// API: Force AC
// ============================================================

app.post(
    "/api/ac-force",
    async (req, res) => {

        try {

            const taskId =
                String(
                    req.body?.task_id ??
                    ""
                ).trim();


            if (
                !/^\d+$/.test(taskId)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "問題番号が不正です。"

                });
            }


            const setting =
                loadSetting();


            if (!setting) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "学生登録が完了していません。"

                });
            }


            /*
             * ローカル
             */
            updateProgressAC(
                taskId
            );


            /*
             * GAS
             */
            try {

                await gasRequest({

                    action:
                        "ac",

                    student_id:
                        setting.student.id,

                    task_id:
                        Number(taskId),

                    status:
                        "AC"

                });

            } catch (error) {

                logError(
                    `手動ACのGAS送信失敗: ${error.message}`
                );

            }


            return res.json({

                success:
                    true,

                type:
                    "AC",

                task_id:
                    taskId,

                forced:
                    true

            });

        } catch (error) {

            return sendServerError(
                res,
                error
            );
        }
    }
);


// ============================================================
// Static files
// ============================================================

/*
 * tests.json / progress.json / iq_setting.json を
 * express.static で丸見えにしたくないため、
 * 静的ファイルはホワイトリスト方式。
 */

const PUBLIC_FILES = new Set([
    "practice.html"
]);


app.get(
    "*",
    (req, res) => {

        const requested =
            decodeURIComponent(
                req.path
            ).replace(
                /^\/+/,
                ""
            );


        /*
         * /iq/practice.html
         * にも対応
         */
        const relative =
            requested.startsWith("iq/")
                ? requested.slice(3)
                : requested;


        /*
         * APIではない公開対象
         */

        if (
            PUBLIC_FILES.has(relative)
        ) {

            return res.sendFile(
                path.join(
                    ROOT_DIR,
                    relative
                )
            );
        }


        /*
         * ルート
         */

        if (
            relative === ""
        ) {

            return res.sendFile(
                PRACTICE_HTML
            );
        }


        /*
         * それ以外は404
         */

        return res.status(404).send(
            "Not Found"
        );
    }
);


// ============================================================
// Error helper
// ============================================================

function sendServerError(
    res,
    error
) {

    logError(
        error.stack ||
        error.message
    );


    return res.status(500).json({

        success:
            false,

        error:
            summarizeGeneralError(
                error
            )

    });
}


// ============================================================
// CLI
// ============================================================

function printCLIResult(
    result
) {

    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );
}


async function cliMakeId(
    name
) {

    const existing =
        loadSetting();


    if (existing) {

        console.error(
            "Student ID has already been registered."
        );

        process.exit(1);
    }


    if (!name) {

        console.error(
            'Usage: iq makeid "name"'
        );

        process.exit(1);
    }


    const studentId =
        crypto.randomUUID();


    try {

        const result =
            await gasRequest({

                action:
                    "makeid",

                name:
                    name,

                student_id:
                    studentId

            });


        if (!result.success) {

            throw new Error(
                result.error ||
                "GASへの登録に失敗しました。"
            );
        }


        const student = {

            name:
                name,

            id:
                studentId,

            row:
                result.row ??
                null

        };


        saveSetting(
            student
        );


        initializeProgress(
            student
        );


        console.log(
            "Student registration completed."
        );


        console.log(
            JSON.stringify(
                student,
                null,
                2
            )
        );


    } catch (error) {

        console.error(
            error.message
        );

        process.exit(1);
    }
}


function cliConfirm(
    lecture
) {

    const progress =
        loadProgress();


    const tasks =
        progress.tasks ||
        {};


    const prefix =
        String(lecture);


    console.log(
        `第${lecture}講`
    );


    const entries =
        Object.entries(
            tasks
        )
        .filter(
            ([taskId]) =>
                taskId.startsWith(
                    prefix
                )
        )
        .sort(
            ([a], [b]) =>
                Number(a) - Number(b)
        );


    if (
        entries.length === 0
    ) {

        console.log(
            "該当する問題はありません。"
        );

        return;
    }


    for (
        const [taskId, task] of entries
    ) {

        if (
            task.status === "AC"
        ) {

            console.log(
                `✓ AC  ${taskId}  ${task.updated_at || ""}`
            );

        } else {

            console.log(
                `- 未挑戦  ${taskId}`
            );
        }
    }
}


function cliStatus() {

    const progress =
        loadProgress();


    console.log(
        progress.student?.name ||
        "未登録"
    );


    const tasks =
        progress.tasks ||
        {};


    const entries =
        Object.entries(
            tasks
        );


    if (
        entries.length === 0
    ) {

        console.log(
            "- 未挑戦"
        );

        return;
    }


    const lectures = {};


    for (
        const [taskId, task]
            of entries
    ) {

        const lecture =
            taskId.length > 1
                ? taskId.slice(
                    0,
                    -1
                )
                : taskId;


        if (
            !lectures[lecture]
        ) {

            lectures[lecture] = {
                total: 0,
                ac: 0
            };
        }


        lectures[lecture].total++;


        if (
            task.status === "AC"
        ) {

            lectures[lecture].ac++;
        }
    }


    for (
        const [lecture, data]
            of Object.entries(
                lectures
            )
    ) {

        const percentage =
            Math.round(
                data.ac /
                data.total *
                100
            );


        console.log(
            `第${lecture}講  ${data.ac}/${data.total}  ${percentage}%`
        );
    }
}


/**
 * bin/iq:
 *
 * iq excuse 12.py
 *
 * という呼び出しを想定。
 */
async function cliExcuse(file) {

    // ------------------------------------------------------------
    // ファイル存在確認
    // ------------------------------------------------------------

    if (
        !file ||
        !fs.existsSync(file)
    ) {

        console.error(
            `ファイルが見つかりません: ${file}`
        );

        process.exit(1);
    }


    // ------------------------------------------------------------
    // 拡張子確認
    // ------------------------------------------------------------

    const extension =
        path.extname(
            file
        ).toLowerCase();


    if (extension !== ".py") {

        console.error(
            "現在のジャッジシステムはPythonのstudent.py方式に対応しています。"
        );

        process.exit(1);
    }


    // ------------------------------------------------------------
    // 問題番号取得
    //
    // 12.py
    // ↓
    // 12
    // ------------------------------------------------------------

    const basename =
        path.basename(
            file,
            extension
        );


    if (
        !/^\d+$/.test(
            basename
        )
    ) {

        console.error(
            "ファイル名から問題番号を取得できません。例: 12.py"
        );

        process.exit(1);
    }


    const taskId =
        basename;


    // ------------------------------------------------------------
    // ソースコード読み込み
    // ------------------------------------------------------------

    const code =
        fs.readFileSync(
            file,
            "utf8"
        );


    // ------------------------------------------------------------
    // Pythonジャッジ
    // ------------------------------------------------------------

    console.log(
        `[INFO] Judge start: task=${taskId}`
    );


    const result =
        await judgePython(
            code,
            taskId
        );


    // ------------------------------------------------------------
    // CLI結果表示
    // ------------------------------------------------------------

    printCLIResult(
        result
    );


    // ------------------------------------------------------------
    // ACの場合
    // ------------------------------------------------------------

    if (
        result.status === "AC"
    ) {

        // --------------------------------------------------------
        // ローカル進捗を更新
        // --------------------------------------------------------

        updateProgressAC(
            taskId
        );


        // --------------------------------------------------------
        // GASへACを通知
        // --------------------------------------------------------

        const setting =
            loadSetting();


        console.log(
            "[DEBUG] setting =",
            JSON.stringify(setting)
        );


        if (
            setting &&
            setting.student
        ) {

            const studentId =
                String(
                    setting.student.id || ""
                ).trim();


            console.log(
                "[DEBUG] studentId =",
                studentId
            );


            if (!studentId) {

                console.error(
                    "[ERROR] GAS AC送信に必要なstudent_idがありません。"
                );

            } else {

                try {

                    const gasData = {

                        action:
                            "ac",

                        student_id:
                            studentId,

                        task_id:
                            Number(taskId),

                        status:
                            "AC"
                    };


                    console.log(
                        "[GAS AC DATA]",
                        JSON.stringify(gasData)
                    );


                    const gasResult =
                        await gasRequest(
                            gasData
                        );


                    console.log(
                        "[INFO] GAS AC登録成功:",
                        JSON.stringify(gasResult)
                    );


                } catch (error) {

                    console.error(
                        "[ERROR] ACのGAS送信に失敗しました:",
                        error.message
                    );
                }
            }

        } else {

            console.error(
                "[ERROR] setting.student が存在しません。"
            );
        }
    }


    // ------------------------------------------------------------
    // CLI終了
    //
    // ACなら0
    // それ以外なら1
    // ------------------------------------------------------------

    if (
        result.status === "AC"
    ) {

        process.exit(0);

    } else {

        process.exit(1);
    }
}


async function mainCLI() {

    const args =
        process.argv.slice(2);


    if (
        args.length === 0
    ) {

        return false;
    }


    const command =
        args[0];


    /*
     * --makeid
     */
    if (
        command === "--makeid"
    ) {

        await cliMakeId(
            args[1]
        );

        return true;
    }


    /*
     * --confirm
     */
    if (
        command === "--confirm"
    ) {

        cliConfirm(
            args[1]
        );

        return true;
    }


    /*
     * --status
     */
    if (
        command === "--status"
    ) {

        cliStatus();

        return true;
    }


    /*
     * --version
     */
    if (
        command === "--version"
    ) {

        console.log(
            "IQ Programming Practice"
        );

        console.log(
            "Version: 1.0.0"
        );

        console.log(
            `Node.js: ${process.version}`
        );

        return true;
    }


    /*
     * --force-ac
     */
    if (
        command === "--force-ac"
    ) {

        const taskId =
            args[1];


        if (
            !taskId
        ) {

            console.error(
                "Usage: iq ac -force <task_id>"
            );

            process.exit(1);
        }


        updateProgressAC(
            taskId
        );


        console.log(
            `Problem ${taskId}: AC`
        );


        return true;
    }


    /*
     * --excuse
     */
    if (
        command === "--excuse"
    ) {

        await cliExcuse(
            args[1]
        );

        return true;
    }


    return false;
}


// ============================================================
// Start
// ============================================================

mainCLI()
    .then(
        handled => {

            if (handled) {
                return;
            }


            app.listen(
                PORT,
                HOST,
                () => {

                    console.log("");

                    console.log(
                        "=============================================="
                    );

                    console.log(
                        " IQ Programming Practice"
                    );

                    console.log(
                        "=============================================="
                    );

                    console.log("");

                    console.log(
                        `[ OK ] Server started`
                    );

                    console.log(
                        `      http://localhost:${PORT}/`
                    );

                    console.log(
                        `      http://localhost:${PORT}/practice.html`
                    );

                    console.log("");

                }
            );
        }
    )
    .catch(
        error => {

            logError(
                error.stack ||
                error.message
            );

            process.exit(1);
        }
    );