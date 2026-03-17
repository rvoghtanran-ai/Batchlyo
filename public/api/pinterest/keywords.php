<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$seed = isset($_GET['q']) ? trim($_GET['q']) : '';
if (empty($seed)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing query parameter ?q="]);
    exit;
}

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
$queries = [
    "pinterest " . $seed,
    $seed . " pinterest ideas",
    $seed . " ideas",
    $seed . " aesthetic",
    $seed . " inspiration",
    $seed . " for beginners",
    $seed . " diy",
    $seed . " trending"
];

$mh = curl_multi_init();
$curls = [];
foreach ($queries as $i => $q) {
    $url = "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=" . urlencode($q);
    $curls[$i] = curl_init();
    curl_setopt($curls[$i], CURLOPT_URL, $url);
    curl_setopt($curls[$i], CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curls[$i], CURLOPT_USERAGENT, $ua);
    curl_multi_add_handle($mh, $curls[$i]);
}

$running = null;
do {
    curl_multi_exec($mh, $running);
    curl_multi_select($mh);
} while ($running > 0);

$keywords = [];
$seen = [];
$seedLower = strtolower($seed);

foreach ($curls as $i => $c) {
    $res = curl_multi_getcontent($c);
    curl_multi_remove_handle($mh, $c);
    if ($res) {
        $data = json_decode($res, true);
        if (is_array($data) && isset($data[1]) && is_array($data[1])) {
            foreach ($data[1] as $kw) {
                $clean = trim(strtolower($kw));
                if ($clean === $seedLower || strlen($clean) < 4) continue;
                if (!isset($seen[$clean])) {
                    $seen[$clean] = true;
                    $keywords[] = $clean;
                }
            }
        }
    }
}
curl_multi_close($mh);

echo json_encode(["keywords" => $keywords, "seed" => $seed, "count" => count($keywords)]);
?>
