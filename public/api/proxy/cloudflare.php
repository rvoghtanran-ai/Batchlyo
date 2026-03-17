<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || empty($data['targetUrl'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing targetUrl']);
    exit;
}

$targetUrl = $data['targetUrl'];
$apiKey = isset($data['apiKey']) ? $data['apiKey'] : null;
$body = isset($data['body']) ? $data['body'] : null;

$isPollinations = strpos($targetUrl, 'pollinations.ai') !== false;
$method = $isPollinations ? 'GET' : 'POST';

$headers = [
    'Content-Type: application/json',
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept: application/json, text/plain, */*'
];

if (!empty($apiKey) && $apiKey !== 'none') {
    $headers[] = 'Authorization: Bearer ' . $apiKey;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_HEADER, true);

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
} else {
    curl_setopt($ch, CURLOPT_HTTPGET, true);
}

curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

$resHeaders = substr($response, 0, $header_size);
$resBody = substr($response, $header_size);
curl_close($ch);

if ($httpcode >= 400) {
    http_response_code($httpcode);
    echo json_encode(['error' => $resBody]);
    exit;
}

if ($isPollinations) {
    $contentType = 'image/png';
    if (preg_match('/Content-Type:\s*([^\s\r\n]+)/i', $resHeaders, $matches)) {
        $contentType = $matches[1];
    }
    header("Content-Type: $contentType");
    echo $resBody;
} else {
    header("Content-Type: application/json");
    echo $resBody;
}
?>
