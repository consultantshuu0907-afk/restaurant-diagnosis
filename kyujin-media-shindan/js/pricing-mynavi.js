// ========================================
// マイナビバイト 掲載料金データ
//
//   出典: マイナビバイト 料金表 No.MB202509（2025年9月時点の情報・記載料金は税抜）
//   検証: tools/verify_mynavi.py（PDF本文の全金額と多重集合で突合／
//         エリア間の価格比の法則チェック／表領域に画像が無いことの確認）
//
// エリアの法則
//   4区分: 関東（東京・神奈川・埼玉・千葉・栃木・群馬・茨城）
//          関西（大阪・兵庫・京都・滋賀・奈良・和歌山）
//          東海（愛知・静岡・岐阜・三重）
//          その他（上記以外）
//   価格比は 関東 1 : 関西 0.9 : 東海 0.8 : その他 0.7 が基本（端数丸めあり）。
//   例外は「アルバイトの基本プラン ADスタンダードプラス」のみで、7区分の独自価格。
//
// 商品の序列（露出度 高 → 低）
//   ADプレミアム ＞ ADスーパー ＞ ADスタンダードプラス ＞ ADスタンダード ＞ ADライト ＞ ADテキスト
//   （回数券は同名の PP シリーズ）
// ========================================

var mynaviPricing = {
    label: 'マイナビバイト',
    source: 'マイナビバイト 料金表 No.MB202509（2025年9月時点・税抜）',
    note: '記載料金は税抜です。オプションは基本プラン・フリープラン・回数券・年間プランのいずれかに参画のうえ申込みが必要です。',

    // 4エリア区分と該当都道府県
    areas: ['関東', '関西', '東海', 'その他'],
    areaDef: {
        '関東': '東京・神奈川・埼玉・千葉・栃木・群馬・茨城',
        '関西': '大阪・兵庫・京都・滋賀・奈良・和歌山',
        '東海': '愛知・静岡・岐阜・三重',
        'その他': '上記以外'
    },

    // 診断Q1（ディップ基準の10エリア）→ マイナビ4エリア
    areaMap: {
        shutoken: '関東',   // 東京・千葉・埼玉・神奈川
        kitakanto: '関東',  // 群馬・栃木・茨城
        kansai: '関西',     // 大阪・京都・兵庫
        shiga: '関西',      // 滋賀・奈良・和歌山
        tokai: '東海',      // 愛知・岐阜・三重
        shizuoka: '東海',   // 静岡
        hokkaido: 'その他',
        hokuriku: 'その他',
        chugoku: 'その他',
        kyushu: 'その他'
    },

    // ADスタンダードプラス（アルバイト基本プラン）だけの7区分
    spAreas: ['東京23区', '東京23区外', '神奈川・千葉・埼玉', '大阪・京都・兵庫',
        '奈良・和歌山・滋賀', '東海', '北海道・東北・北関東・甲信越・北陸・中四国・九州'],
    // 診断エリア → 7区分（首都圏は3つに分かれるため複数を返す）
    spAreaMap: {
        shutoken: ['東京23区', '東京23区外', '神奈川・千葉・埼玉'],
        kitakanto: ['北海道・東北・北関東・甲信越・北陸・中四国・九州'],
        kansai: ['大阪・京都・兵庫'],
        shiga: ['奈良・和歌山・滋賀'],
        tokai: ['東海'],
        shizuoka: ['東海'],
        hokkaido: ['北海道・東北・北関東・甲信越・北陸・中四国・九州'],
        hokuriku: ['北海道・東北・北関東・甲信越・北陸・中四国・九州'],
        chugoku: ['北海道・東北・北関東・甲信越・北陸・中四国・九州'],
        kyushu: ['北海道・東北・北関東・甲信越・北陸・中四国・九州']
    },

    // 露出度の高い順
    productOrder: ['ADプレミアム', 'ADスーパー', 'ADスタンダードプラス',
        'ADスタンダード', 'ADライト', 'ADテキスト'],

    // ========== マイナビバイトプラン（アルバイト・パート）==========
    parttime: {
        label: 'マイナビバイトプラン（アルバイト・パート）',
        // 基本プラン：4エリア（値は 関東/関西/東海/その他 の順）
        basic: [
            { product: 'ADプレミアム', sites: 3, period: '1週間', area4: [200000, 180000, 160000, 140000] },
            { product: 'ADプレミアム', sites: 3, period: '2週間', area4: [400000, 360000, 320000, 280000] },
            { product: 'ADプレミアム', sites: 3, period: '4週間', area4: [800000, 720000, 640000, 560000] },
            { product: 'ADスーパー', sites: 2, period: '1週間', area4: [80000, 72000, 64000, 56000] },
            { product: 'ADスーパー', sites: 2, period: '2週間', area4: [140000, 126000, 112000, 98000] },
            { product: 'ADスーパー', sites: 2, period: '4週間', area4: [240000, 216000, 192000, 168000] },
            // ADスタンダードプラスのみ7区分（spAreas の順）
            { product: 'ADスタンダードプラス', sites: 1, period: '1週間',
                area7: [50000, 40000, 45000, 45000, 40000, 40000, 35000] },
            { product: 'ADスタンダードプラス', sites: 1, period: '2週間',
                area7: [80000, 64000, 72000, 72000, 64000, 64000, 56000] },
            { product: 'ADスタンダードプラス', sites: 1, period: '4週間',
                area7: [140000, 112000, 126000, 126000, 112000, 112000, 98000] },
            { product: 'ADスタンダード', sites: 1, period: '1週間', flat: 30000 },
            { product: 'ADスタンダード', sites: 1, period: '2週間', flat: 50000 },
            { product: 'ADスタンダード', sites: 1, period: '4週間', flat: 80000 },
            { product: 'ADライト', sites: 1, period: '1週間', flat: 20000 },
            { product: 'ADライト', sites: 1, period: '2週間', flat: 40000 },
            { product: 'ADライト', sites: 1, period: '4週間', flat: 70000 }
        ],
        // 応募課金型（掲載料ではないため価格比較の対象外）
        entry: [
            { product: 'エントリープラス', sites: 1, period: '12週間', perApply: 15000,
                note: '医療・介護・保育の職種はご掲載いただけません。1原稿あたり500円の参画料。' },
            { product: 'エントリー', sites: 1, period: '12週間', perApply: 8000,
                note: '医療・介護・保育は15,000円。1原稿あたり500円の参画料。' }
        ],
        free: [
            { product: 'ADプレミアム', sites: null, period: null, flat: null },
            { product: 'ADスーパー', sites: 2, period: '4週間', flat: 280000 },
            { product: 'ADスタンダードプラス', sites: 1, period: '4週間', flat: 180000 },
            { product: 'ADスタンダード', sites: 1, period: '4週間', flat: 100000 },
            { product: 'ADライト', sites: 1, period: '4週間', flat: 75000 },
            { product: 'ADテキスト', sites: 1, period: '4週間', flat: 10000 }
        ],
        coupon: [
            { product: 'PPプレミアム', sites: 3, period: '1週間', area4: [2000000, 1800000, 1600000, 1400000] },
            { product: 'PPスーパー', sites: 2, period: '1週間', area4: [800000, 720000, 640000, 560000] },
            { product: 'PPスーパー', sites: 2, period: '2週間', area4: [1400000, 1260000, 1120000, 980000] },
            { product: 'PPスーパー', sites: 2, period: '4週間', area4: [2400000, 2160000, 1920000, 1680000] },
            { product: 'PPスタンダードプラス', sites: 1, period: '1週間', area4: [500000, 450000, 400000, 350000] },
            { product: 'PPスタンダードプラス', sites: 1, period: '2週間', area4: [800000, 720000, 640000, 560000] },
            { product: 'PPスタンダードプラス', sites: 1, period: '4週間', area4: [1400000, 1260000, 1120000, 980000] },
            { product: 'PPスタンダード', sites: 1, period: '1週間', flat: 285000 },
            { product: 'PPスタンダード', sites: 1, period: '2週間', flat: 450000 },
            { product: 'PPスタンダード', sites: 1, period: '4週間', flat: 720000 },
            { product: 'PPライト', sites: 1, period: '1週間', flat: 200000 },
            { product: 'PPライト', sites: 1, period: '2週間', flat: 380000 },
            { product: 'PPライト', sites: 1, period: '4週間', flat: 630000 }
        ],
        yearly: [
            { product: '年間プラン スタンダード', sites: 1, period: '1年間', flat: 936000 },
            { product: '年間プラン ライト', sites: 1, period: '1年間', flat: 819000 }
        ]
    },

    // ========== 正社員プラン ==========
    fulltime: {
        label: '正社員プラン',
        basic: [
            { product: 'ADプレミアム', sites: 3, period: '4週間', area4: [700000, 630000, 560000, 490000] },
            { product: 'ADスーパー', sites: 3, period: '4週間', area4: [525000, 473000, 420000, 368000] },
            { product: 'ADスタンダードプラス', sites: 3, period: '4週間', area4: [367000, 331000, 294000, 257000] },
            { product: 'ADスタンダード', sites: 3, period: '4週間', area4: [240000, 216000, 192000, 168000] },
            { product: 'ADライト', sites: 1, period: '4週間', area4: [140000, 126000, 112000, 98000] }
        ],
        entry: [
            { product: 'エントリー', sites: 1, period: '12週間', perApply: 29000,
                note: '1原稿あたり500円の参画料。' }
        ],
        free: [
            { product: 'ADプレミアム', sites: 3, period: '4週間', flat: 740000 },
            { product: 'ADスーパー', sites: 3, period: '4週間', flat: 552000 },
            { product: 'ADスタンダードプラス', sites: 3, period: '4週間', flat: 386000 },
            { product: 'ADスタンダード', sites: 3, period: '4週間', flat: 280000 },
            { product: 'ADライト', sites: 1, period: '4週間', flat: 180000 },
            { product: 'ADテキスト', sites: 1, period: '4週間', flat: 24000 }
        ],
        coupon: [
            { product: 'PPプレミアム', sites: 3, period: '4週間', area4: [7000000, 6300000, 5600000, 4900000] },
            { product: 'PPスーパー', sites: 3, period: '4週間', area4: [5250000, 4730000, 4200000, 3680000] },
            { product: 'PPスタンダードプラス', sites: 3, period: '4週間', area4: [3670000, 3310000, 2940000, 2570000] },
            { product: 'PPスタンダード', sites: 3, period: '4週間', area4: [2160000, 1944000, 1728000, 1512000] },
            { product: 'PPライト', sites: 1, period: '4週間', area4: [1260000, 1134000, 1008000, 882000] }
        ],
        yearly: [
            { product: '年間プラン スタンダード', sites: 3, period: '1年間', area4: [2808000, 2527200, 2246400, 1965600] },
            { product: '年間プラン ライト', sites: 1, period: '1年間', area4: [1638000, 1474200, 1310400, 1146600] }
        ]
    },

    // ========== オプション ==========
    options: [
        { no: 1, name: 'Extraバナー', fulltimeOk: true, period: '1週間', area4: [150000, 135000, 120000, 105000] },
        { no: 2, name: 'サジェストピックアップ', fulltimeOk: false, period: '1週間', area4: [80000, 72000, 64000, 56000] },
        { no: 3, name: '検索画面PRバナー', fulltimeOk: false, period: '1週間', area4: [80000, 72000, 64000, 56000] },
        { no: 4, name: 'クロスローテーション', fulltimeOk: true, period: '1週間', area4: [80000, 72000, 64000, 56000] },
        { no: 5, name: 'リザーブシート（スペシャル）', fulltimeOk: true, period: '1週間', area4: [70000, 63000, 56000, 49000] },
        { no: 6, name: 'リザーブシート（ベーシック）', fulltimeOk: true, period: '1週間', area4: [50000, 45000, 40000, 35000] },
        { no: 7, name: 'リザーブシート（こだわり）', fulltimeOk: true, period: '1週間', flat: 50000 },
        { no: 8, name: '新着上位', fulltimeOk: false, period: '2日or3日', flat: 20000 },
        { no: 9, name: '特集上位', fulltimeOk: true, period: '1週間', flat: 10000 },
        { no: 10, name: '面接確約フラグ', fulltimeOk: true, period: '1週間', flat: 5000 },
        { no: 11, name: '急募フラグ', fulltimeOk: true, period: '1週間', flat: 2000 },
        { no: 12, name: '検索連動バナー', fulltimeOk: true, period: '1週間', flat: 2000 },
        { no: 13, name: 'ランディングページバナー', fulltimeOk: false, period: '4週間', flat: 100000 },
        { no: 14, name: 'ラージピクチャー', fulltimeOk: true, period: '1週間', flat: 50000 },
        { no: 15, name: 'スペシャルコンテンツバナー', fulltimeOk: false, period: '4週間', flat: 100000 }
    ],

    // 掲載料ではないもの（価格比較に含めない）
    point: { name: 'マイナビバイトポイント', price: '1万pt〜', note: '1point＝1円換算。有効期限は有効期間開始日から1年間。' }
};
