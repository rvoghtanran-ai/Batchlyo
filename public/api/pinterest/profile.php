<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$username = isset($_GET['username']) ? trim($_GET['username']) : '';
$username = ltrim($username, '@');
$username = rtrim($username, '/');

if (empty($username)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing ?username="]);
    exit;
}

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://www.pinterest.com/{$username}/pins/");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, $ua);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Accept: text/html", "Accept-Language: en-US,en;q=0.9"]);
$html = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpcode >= 400 || !$html) {
    http_response_code($httpcode ?: 500);
    echo json_encode(["error" => "Pinterest returned $httpcode"]);
    exit;
}

function extract_match($pattern, $html) {
    if (preg_match($pattern, $html, $matches)) {
        return $matches[1];
    }
    return null;
}

$followerCount = (int)(extract_match("/follower_count['\":\s]+(\d+)/", $html) ?: 0);
$pinCount = (int)(extract_match("/pin_count['\":\s]+(\d+)/", $html) ?: 0);
$boardCount = (int)(extract_match("/board_count['\":\s]+(\d+)/", $html) ?: 0);
$fullName = extract_match('/"full_name":"([^"]+)"/', $html) ?: $username;
$about = extract_match('/"about":"([^"]*?)"/', $html) ?: '';
$domainUrl = extract_match('/"domain_url":"([^"]+)"/', $html) ?: '';
$profileImg = extract_match('/"image_xlarge_url":"([^"]+)"/', $html) ?: extract_match('/"image_large_url":"([^"]+)"/', $html) ?: '';
$isVerified = strpos($html, '"is_verified_merchant":true') !== false;

$pins = [];
if (preg_match_all('/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/', $html, $matches)) {
    foreach ($matches[1] as $jsonData) {
        $data = json_decode($jsonData, true);
        if ($data) {
            findPins($data, 0, $pins);
        }
    }
}

function findPins($obj, $depth, &$pins) {
    if ($depth > 8 || !is_array($obj) || count($pins) >= 50) return;
    
    if (isset($obj['grid_title']) && isset($obj['id']) && isset($obj['images'])) {
        $imgUrl = '';
        if (isset($obj['images']['236x']['url'])) $imgUrl = $obj['images']['236x']['url'];
        elseif (isset($obj['images']['474x']['url'])) $imgUrl = $obj['images']['474x']['url'];
        elseif (isset($obj['images']['orig']['url'])) $imgUrl = $obj['images']['orig']['url'];
        
        $pins[] = [
            'id' => (string)$obj['id'],
            'title' => $obj['grid_title'] ?: '',
            'description' => substr($obj['description'] ?? '', 0, 300),
            'link' => $obj['link'] ?? '',
            'domain' => $obj['domain'] ?? '',
            'image' => $imgUrl,
            'createdAt' => $obj['created_at'] ?? '',
            'boardName' => $obj['board']['name'] ?? '',
            'seoTitle' => $obj['seo_title'] ?? '',
            'dominantColor' => $obj['dominant_color'] ?? '',
            'ratingCount' => $obj['rich_summary']['aggregate_rating']['rating_count'] ?? 0,
            'reviewCount' => $obj['rich_summary']['aggregate_rating']['review_count'] ?? 0,
            'hasVideo' => !empty($obj['video_status']),
        ];
        return;
    }
    
    foreach ($obj as $val) {
        if (is_array($val)) {
            findPins($val, $depth + 1, $pins);
        }
    }
}

$timestamps = [];
foreach ($pins as $p) {
    if (!empty($p['createdAt'])) {
        $timestamps[] = strtotime($p['createdAt']);
    }
}
rsort($timestamps);
$avgDaysBetweenPins = 0;
if (count($timestamps) >= 2) {
    $spanDays = ($timestamps[0] - $timestamps[count($timestamps) - 1]) / (60 * 60 * 24);
    $avgDaysBetweenPins = round($spanDays / (count($timestamps) - 1));
}

$boardDist = [];
foreach ($pins as $p) {
    if (!empty($p['boardName'])) {
        $name = $p['boardName'];
        if (!isset($boardDist[$name])) $boardDist[$name] = 0;
        $boardDist[$name]++;
    }
}

$stopWordsList = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'this', 'that', 'from', 'as', 'are', 'was', 'be', 'has', 'had', 'have', 'its', 'your', 'you', 'we', 'our', 'my', 'me', 'do'];
$stopWords = array_flip($stopWordsList);
$wordFreq = [];
foreach ($pins as $p) {
    $text = strtolower(($p['title'] ?? '') . ' ' . ($p['description'] ?? ''));
    $text = preg_replace('/[^a-z\s]/', '', $text);
    $words = preg_split('/\s+/', $text);
    foreach ($words as $w) {
        if (strlen($w) > 3 && !isset($stopWords[$w])) {
            if (!isset($wordFreq[$w])) $wordFreq[$w] = 0;
            $wordFreq[$w]++;
        }
    }
}
arsort($wordFreq);
$topKeywords = [];
$i = 0;
foreach ($wordFreq as $word => $count) {
    if ($i++ >= 20) break;
    $topKeywords[] = ['word' => $word, 'count' => $count];
}

echo json_encode([
    'username' => $username,
    'fullName' => $fullName,
    'about' => $about,
    'followerCount' => $followerCount,
    'pinCount' => $pinCount,
    'boardCount' => $boardCount,
    'domainUrl' => $domainUrl,
    'profileImg' => $profileImg,
    'isVerified' => $isVerified,
    'pins' => $pins,
    'analytics' => [
        'avgDaysBetweenPins' => $avgDaysBetweenPins,
        'boardDistribution' => $boardDist,
        'topKeywords' => $topKeywords,
        'totalPinsScanned' => count($pins),
        'oldestPinDate' => count($timestamps) > 0 ? date('c', $timestamps[count($timestamps) - 1]) : null,
        'newestPinDate' => count($timestamps) > 0 ? date('c', $timestamps[0]) : null,
    ],
    'scannedAt' => date('c'),
]);
?>
