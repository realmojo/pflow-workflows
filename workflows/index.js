/**
 * 로컬 테스트용 스크립트
 * 부동산 지역별, 국내주식 상위 20개, 미국주식 상위 20개 콘텐츠 생성 및 네이버 카페 게시 테스트
 */

// 환경 변수 로드 (dotenv 사용 시)
// require('dotenv').config();

// 환경 변수 설정 (로컬 테스트용)
// 로컬에서 테스트하려면: PFLOW_BASE_URL=http://localhost:3000
const baseUrl = "https://pflow.app";

const accounts = [
  {
    id: "strikers1999",
    types: ["domestic"],
  },
  {
    id: "sdfddf",
    types: ["world"],
  },
  {
    id: "tedevspace",
    types: ["crypto"],
  },
];

// 플래그 확인
const isTestMode = process.argv.includes("--test");
const isDomesticOnly = process.argv.includes("--d"); // 국내주식만
const isWorldOnly = process.argv.includes("--w"); // 미국주식만
const isCryptoOnly = process.argv.includes("--c"); // 크립토만

// clubId 설정 (--test 모드일 때는 테스트용 clubId 사용)
const clubId = isTestMode ? 31625508 : 31632186;

// 주식별 메뉴 ID (--test 모드일 때는 모든 메뉴 ID를 1로 설정)
const MENU_IDS = isTestMode
  ? {
      domestic: 1, // 테스트 모드: 국내주식
      world: 1, // 테스트 모드: 미국주식
      cryptoTop10: 1, // 테스트 모드: 크립토(TOP10)
      cryptoAlt: 1, // 테스트 모드: 크립토(알트)
    }
  : {
      domestic: 5, // 국내주식
      world: 6, // 미국주식
      cryptoTop10: 29, // 크립토(TOP10)
      cryptoAlt: 30, // 크립토(알트)
    };

// 상위 10개 코인 목록 (비트코인, 이더리움, 테더, 엑스알피(리플), 유에스디코인, 솔라나, 트론, 도지코인, 에이다, 비트코인캐시)
const TOP10_CRYPTO_CODES = [
  "KRW-BTC", // 비트코인
  "KRW-ETH", // 이더리움
  "KRW-USDT", // 테더
  "KRW-XRP", // 엑스알피(리플)
  "KRW-USDC", // 유에스디코인
  "KRW-SOL", // 솔라나
  "KRW-TRX", // 트론
  "KRW-DOGE", // 도지코인
  "KRW-ADA", // 에이다
  "KRW-BCH", // 비트코인캐시
];

/**
 * 네이버 토큰 갱신 (계정별)
 */
async function refreshNaverTokenForAccount(refreshTokenValue) {
  if (!refreshTokenValue) {
    throw new Error("refresh_token이 설정되지 않았습니다.");
  }

  try {
    console.log("네이버 토큰 갱신 중...");
    const refreshUrl = `${baseUrl}/api/naver/refresh`;
    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (!response.ok) {
      throw new Error(
        `토큰 갱신 실패: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `토큰 갱신 실패: ${data.error_description || data.error}`,
      );
    }

    // pflow api 호출
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshTokenValue, // 새로운 refresh_token이 있으면 업데이트
    };
  } catch (error) {
    console.error("토큰 갱신 오류:", error);
    throw error;
  }
}

/**
 * 배열 랜덤 섞기 (Fisher-Yates 알고리즘)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 상위 주식 목록 가져오기 (국내: 100개, 미국: 20개)
 */
async function getTop20Stocks(stockType, baseUrl) {
  const size = stockType === "usa" ? 20 : 100;
  const url = `${baseUrl}/api/getFavoriteList?type=${stockType}&size=${size}`;

  console.log(`[${stockType}] 상위 ${size}개 주식 목록 가져오기: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `주식 목록 가져오기 실패: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data || [];
}

/**
 * 전체 크립토 목록 가져오기
 */
async function getTopAllCrypto(baseUrl) {
  const url = `${baseUrl}/api/getUpbitCoinList`;

  console.log(`[크립토] 전체 코인 목록 가져오기: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `크립토 목록 가져오기 실패: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data || [];
}

/**
 * Pflow 콘텐츠 생성 API 호출 (개별 주식)
 */
async function generateStockContent(stockCode, stockType, baseUrl) {
  const url = `${baseUrl}/api/pflow-content?type=stock&code=${encodeURIComponent(
    stockCode,
  )}&stockType=${stockType}`;

  console.log(`[${stockType}] 개별 주식 콘텐츠 생성 API 호출: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // 에러 응답 본문 읽기
    let errorMessage = `${response.status} ${response.statusText}`;
    let errorData = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      console.error(
        `[${stockType}] API 에러 응답:`,
        JSON.stringify(errorData, null, 2),
      );
    } catch (e) {
      // JSON 파싱 실패 시 기본 메시지 사용
      const text = await response.text();
      console.error(`[${stockType}] API 에러 응답 (텍스트):`, text);
    }
    throw new Error(`콘텐츠 생성 실패: ${errorMessage}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Pflow 콘텐츠 생성 API 호출 (개별 크립토)
 */
async function generateCryptoContent(cryptoCode, baseUrl) {
  const url = `${baseUrl}/api/pflow-content?type=crypto&code=${encodeURIComponent(
    cryptoCode,
  )}`;

  console.log(`[크립토] 개별 코인 콘텐츠 생성 API 호출: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // 에러 응답 본문 읽기
    let errorMessage = `${response.status} ${response.statusText}`;
    let errorData = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      console.error(
        `[크립토] API 에러 응답:`,
        JSON.stringify(errorData, null, 2),
      );
    } catch (e) {
      // JSON 파싱 실패 시 기본 메시지 사용
      const text = await response.text();
      console.error(`[크립토] API 에러 응답 (텍스트):`, text);
    }
    throw new Error(`콘텐츠 생성 실패: ${errorMessage}`);
  }

  const data = await response.json();
  return data;
}

/**
 * 이미지 다운로드
 */
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error(`이미지 다운로드 오류 (${imageUrl}):`, error);
    throw error;
  }
}

/**
 * 네이버 카페 글쓰기 API 호출 (이미지 첨부 지원)
 */
async function postToNaverCafe(
  accessToken,
  clubId,
  menuId,
  subject,
  content,
  imageUrls = [],
) {
  const apiURL = `https://openapi.naver.com/v1/cafe/${clubId}/menu/${menuId}/articles`;

  // FormData 사용 (multipart/form-data)
  // 콘텐츠가 이미 <p> 태그로 포맷되어 있으므로 추가 변환 불필요
  // <p> 태그 내부의 줄바꿈은 이미 <br>로 변환되어 있음
  const formData = new FormData();
  const htmlContent = content;

  // 가격 차트 이미지 추가 (HTML 태그는 그대로 유지)
  // 이미지 태그가 문제를 일으킬 수 있으므로 환경 변수로 제어 가능
  // const originalImageUrl = "https://pflow.app/images/naver-cafe.png";
  // // 네이버 카페 썸네일 서버 형식으로 변환 (원본 URL을 인코딩)
  // const encodedImageUrl = encodeURIComponent(originalImageUrl);
  // const chartImageUrl = `<div style='text-align:center;width:100%;margin:30px 0px 10px 0px;'><a href='https://pflow.app' target='_blank'><img src='https://dthumb-phinf.pstatic.net/?src=${encodedImageUrl}&amp;type=cafe_wa800' class='article_img ATTACH_IMAGE' alt='' data-index='0'></a></div>`;

  // 네이버 카페 API 명세: UTF-8로 encode 후 MS949로 재 encode
  // FormData를 사용할 때는 encodeURIComponent로 URL 인코딩
  // HTML 태그 내의 특수문자도 올바르게 인코딩됨
  const finalContent = htmlContent;

  // encodeURIComponent는 특수문자(/, :, = 등)도 인코딩하므로 더 안전함
  formData.append("subject", encodeURIComponent(subject));
  formData.append("content", encodeURIComponent(finalContent));
  console.log("Content length:", finalContent.length);
  console.log("Content (first 300 chars):", finalContent.substring(0, 300));
  formData.append("openyn", "true"); // 전체 공개 설정

  // 이미지 다운로드 및 첨부
  if (imageUrls && imageUrls.length > 0) {
    console.log(`이미지 ${imageUrls.length}개 다운로드 중...`);
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i];
        const imageBuffer = await downloadImage(imageUrl);
        // FormData에 이미지 추가 (image[0], image[1] 형식)
        // Node.js에서는 Buffer를 직접 사용하거나 Blob 생성
        const blob = new Blob([imageBuffer], { type: "image/png" });
        const fileName = `chart_${i}.png`;
        formData.append(`image[${i}]`, blob, fileName);
        console.log(
          `이미지 ${i + 1}/${imageUrls.length} 다운로드 완료: ${imageUrl}`,
        );
      } catch (error) {
        console.error(`이미지 ${i + 1} 다운로드 실패, 계속 진행:`, error);
        // 이미지 다운로드 실패해도 글쓰기는 계속 진행
      }
    }
  }

  console.log(`네이버 카페 게시 API 호출: ${apiURL}`);
  console.log(`제목: ${subject.substring(0, 50)}...`);
  console.log(`Content 길이: ${finalContent.length}자`);
  console.log(`Content에 이미지 태그 포함: ${finalContent.includes("<img")}`);

  const response = await fetch(apiURL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // Content-Type 헤더는 제거 (fetch가 boundary 포함하여 자동 설정)
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("네이버 카페 API 에러 상세:");
    console.error("Status:", response.status);
    console.error("Response:", JSON.stringify(data, null, 2));
    console.error("Content preview:", finalContent.substring(0, 500));

    throw new Error(
      `네이버 카페 글쓰기 실패: ${response.status} - ${JSON.stringify(data)}`,
    );
  }

  return data;
  // return null;
}

/**
 * 주식 처리 (상위 20개를 각각 개별 게시글로 등록)
 */
async function processStock(
  stockType,
  stockName,
  baseUrl,
  accessToken,
  clubId,
) {
  // 주식 타입에 맞는 메뉴 ID 가져오기
  const menuId = MENU_IDS[stockType];
  try {
    console.log(`\n========== [${stockName}] 처리 시작 ==========`);
    console.log(`[${stockName}] 상위 20개 주식 목록 가져오기...`);

    // 1. 상위 20개 주식 목록 가져오기
    const stocks = await getTop20Stocks(stockType, baseUrl);

    if (!stocks || stocks.length === 0) {
      throw new Error("주식 목록을 가져올 수 없습니다.");
    }

    console.log(`[${stockName}] ${stocks.length}개 주식 발견`);

    // 2. 각 주식에 대해 개별 콘텐츠 생성 및 게시
    const results = [];
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      const stockCode = stock.code;
      const stockNameDisplay = stock.name || stockCode;

      try {
        console.log(
          `\n[${stockName}] ${i + 1}/${
            stocks.length
          } ${stockNameDisplay}(${stockCode}) 처리 중...`,
        );

        // 개별 주식 콘텐츠 생성
        const contentData = await generateStockContent(
          stockCode,
          stockType,
          baseUrl,
        );

        if (!contentData.subject || !contentData.content) {
          throw new Error("콘텐츠 데이터가 없습니다.");
        }

        console.log(`[${stockName}] ${stockNameDisplay} 콘텐츠 생성 완료!`);
        console.log(`제목: ${contentData.subject}`);
        console.log(`내용 길이: ${contentData.content.length}자`);

        // 콘텐츠 미리보기 (처음 200자)
        console.log(`\n내용 미리보기:`);
        console.log(contentData.content.substring(0, 1000) + "...\n");

        // 네이버 카페에 게시
        if (clubId) {
          console.log(
            `[${stockName}] ${stockNameDisplay} 네이버 카페 게시 시작...`,
          );

          // 국내주식인 경우 차트 이미지 URL 추가
          // const imageUrls = [];
          // if (stockType === "domestic") {
          //   const chartImageUrl = `https://ssl.pstatic.net/imgfinance/chart/item/area/day/${stockCode}.png`;
          //   imageUrls.push(chartImageUrl);
          //   console.log(`[${stockName}] 차트 이미지 URL: ${chartImageUrl}`);
          // }

          const result = await postToNaverCafe(
            accessToken,
            clubId,
            menuId,
            contentData.subject,
            contentData.content,
            // imageUrls
          );

          console.log(`[${stockName}] ${stockNameDisplay} 게시 완료!`);
          console.log(`결과:`, JSON.stringify(result, null, 2));

          results.push({
            success: true,
            stockCode,
            stockName: stockNameDisplay,
            subject: contentData.subject,
            result,
          });
        } else {
          console.log(
            `[${stockName}] ${stockNameDisplay} 네이버 카페 인증 정보가 없어 게시를 건너뜁니다.`,
          );
          console.log(`(콘텐츠만 생성하고 게시는 하지 않습니다)`);

          results.push({
            success: true,
            stockCode,
            stockName: stockNameDisplay,
            subject: contentData.subject,
            contentLength: contentData.content.length,
            skipped: true,
            message: "네이버 카페 인증 정보 없음 - 콘텐츠만 생성됨",
          });
        }
      } catch (error) {
        console.error(
          `[${stockName}] ${stockNameDisplay}(${stockCode}) 처리 실패:`,
          error,
        );
        results.push({
          success: false,
          stockCode,
          stockName: stockNameDisplay,
          error: error.message,
        });
      }

      // API Rate Limit 방지를 위한 딜레이 (각 주식 게시 사이에 25초 대기)
      if (i < stocks.length - 1) {
        console.log(
          `[${stockName}] 25초 대기 중... (${i + 1}/${stocks.length} 완료)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 25000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `\n[${stockName}] 처리 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
    );

    return {
      success: true,
      type: "stock",
      name: stockName,
      stockType,
      total: stocks.length,
      successCount,
      failCount,
      results,
    };
  } catch (error) {
    console.error(`[${stockName}] 처리 실패:`, error);
    return {
      success: false,
      type: "stock",
      name: stockName,
      stockType,
      error: error.message,
    };
  }
}

/**
 * 크립토 처리 (전체 목록을 각각 개별 게시글로 등록)
 * 상위 10개 코인은 cryptoTop10 게시판에, 나머지는 cryptoAlt 게시판에 게시
 */
async function processCrypto(baseUrl, accessToken, clubId) {
  try {
    console.log(`\n========== [크립토] 처리 시작 ==========`);
    console.log(`[크립토] 전체 코인 목록 가져오기...`);

    // 1. 전체 크립토 목록 가져오기
    const cryptos = await getTopAllCrypto(baseUrl);

    if (!cryptos || cryptos.length === 0) {
      throw new Error("크립토 목록을 가져올 수 없습니다.");
    }

    console.log(`[크립토] 총 ${cryptos.length}개 코인 발견`);

    // 2. 상위 10개 코인과 나머지 코인 분리
    const top10Cryptos = cryptos.filter((crypto) =>
      TOP10_CRYPTO_CODES.includes(crypto.code),
    );
    const altCryptos = cryptos.filter(
      (crypto) => !TOP10_CRYPTO_CODES.includes(crypto.code),
    );

    console.log(
      `[크립토] 상위 10개 코인: ${top10Cryptos.length}개 (cryptoTop10 게시판)`,
    );
    console.log(`[크립토] 알트코인: ${altCryptos.length}개 (cryptoAlt 게시판)`);
    console.log(`[크립토] 총 ${cryptos.length}개 코인을 등록합니다.`);

    // 3. 상위 10개 코인 처리 (cryptoTop10 게시판)
    const top10Results = await processCryptoGroup(
      top10Cryptos,
      "크립토(TOP10)",
      MENU_IDS.cryptoTop10,
      baseUrl,
      accessToken,
      clubId,
    );

    // 크립토 그룹 간 전환 딜레이 (TOP10 → 알트코인)
    console.log(`\n[크립토] 알트코인 처리 전 25초 대기...`);
    await new Promise((resolve) => setTimeout(resolve, 25000));

    // 4. 알트코인 처리 (cryptoAlt 게시판)
    const altResults = await processCryptoGroup(
      altCryptos,
      "크립토(알트)",
      MENU_IDS.cryptoAlt,
      baseUrl,
      accessToken,
      clubId,
    );

    // 5. 결과 합치기
    const allResults = [...top10Results, ...altResults];
    const successCount = allResults.filter((r) => r.success).length;
    const failCount = allResults.filter((r) => !r.success).length;

    console.log(
      `\n[크립토] 전체 처리 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
    );
    console.log(
      `  - 상위 10개: ${top10Results.filter((r) => r.success).length}/${
        top10Results.length
      } 성공`,
    );
    console.log(
      `  - 알트코인: ${altResults.filter((r) => r.success).length}/${
        altResults.length
      } 성공`,
    );

    return {
      success: true,
      type: "crypto",
      name: "크립토",
      total: cryptos.length,
      successCount,
      failCount,
      results: allResults,
    };
  } catch (error) {
    console.error(`[크립토] 처리 실패:`, error);
    return {
      success: false,
      type: "crypto",
      name: "크립토",
      error: error.message,
    };
  }
}

/**
 * 크립토 그룹 처리 (상위 10개 또는 알트코인)
 */
async function processCryptoGroup(
  cryptos,
  groupName,
  menuId,
  baseUrl,
  accessToken,
  clubId,
) {
  const results = [];

  for (let i = 0; i < cryptos.length; i++) {
    const crypto = cryptos[i];
    const cryptoCode = crypto.code; // KRW-BTC 형식
    const cryptoNameDisplay = crypto.name || cryptoCode;

    try {
      console.log(
        `\n[${groupName}] ${i + 1}/${
          cryptos.length
        } ${cryptoNameDisplay}(${cryptoCode}) 처리 중...`,
      );

      // 개별 크립토 콘텐츠 생성
      const contentData = await generateCryptoContent(cryptoCode, baseUrl);

      if (!contentData.subject || !contentData.content) {
        throw new Error("콘텐츠 데이터가 없습니다.");
      }

      console.log(`[${groupName}] ${cryptoNameDisplay} 콘텐츠 생성 완료!`);
      console.log(`제목: ${contentData.subject}`);
      console.log(`내용 길이: ${contentData.content.length}자`);

      // 콘텐츠 미리보기 (처음 200자)
      console.log(`\n내용 미리보기:`);
      console.log(contentData.content.substring(0, 1000) + "...\n");

      // 네이버 카페에 게시
      if (clubId) {
        console.log(
          `[${groupName}] ${cryptoNameDisplay} 네이버 카페 게시 시작...`,
        );

        const result = await postToNaverCafe(
          accessToken,
          clubId,
          menuId,
          contentData.subject,
          contentData.content,
        );

        console.log(`[${groupName}] ${cryptoNameDisplay} 게시 완료!`);
        console.log(`결과:`, JSON.stringify(result, null, 2));

        results.push({
          success: true,
          cryptoCode,
          cryptoName: cryptoNameDisplay,
          subject: contentData.subject,
          result,
        });
      } else {
        console.log(
          `[${groupName}] ${cryptoNameDisplay} 네이버 카페 인증 정보가 없어 게시를 건너뜁니다.`,
        );
        console.log(`(콘텐츠만 생성하고 게시는 하지 않습니다)`);

        results.push({
          success: true,
          cryptoCode,
          cryptoName: cryptoNameDisplay,
          subject: contentData.subject,
          contentLength: contentData.content.length,
          skipped: true,
          message: "네이버 카페 인증 정보 없음 - 콘텐츠만 생성됨",
        });
      }
    } catch (error) {
      console.error(
        `[${groupName}] ${cryptoNameDisplay}(${cryptoCode}) 처리 실패:`,
        error,
      );
      results.push({
        success: false,
        cryptoCode,
        cryptoName: cryptoNameDisplay,
        error: error.message,
      });
    }

    // API Rate Limit 방지를 위한 딜레이 (각 코인 게시 사이에 25초 대기)
    if (i < cryptos.length - 1) {
      console.log(
        `[${groupName}] 25초 대기 중... (${i + 1}/${cryptos.length} 완료)`,
      );
      await new Promise((resolve) => setTimeout(resolve, 25000));
    }
  }

  return results;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log("=".repeat(60));
  console.log("계정별 타입에 따른 콘텐츠 생성 및 네이버 카페 게시");
  console.log("=".repeat(60));

  // 환경 변수 확인
  console.log("\n환경 변수 확인:");
  if (isTestMode) {
    console.log("🧪 테스트 모드 활성화 (--test)");
  }
  if (isDomesticOnly) console.log("🇰🇷 국내주식만 처리 (--d)");
  if (isWorldOnly) console.log("🇺🇸 미국주식만 처리 (--w)");
  if (isCryptoOnly) console.log("🪙 크립토만 처리 (--c)");
  console.log(`PFLOW_BASE_URL: ${baseUrl}`);
  console.log(`NAVER_CLUB_ID: ${clubId}${isTestMode ? " (테스트 모드)" : ""}`);
  console.log(
    `메뉴 ID - 국내주식: ${MENU_IDS.domestic}, 미국주식: ${
      MENU_IDS.world
    }, 크립토(TOP10): ${MENU_IDS.cryptoTop10}, 크립토(알트): ${
      MENU_IDS.cryptoAlt
    }${isTestMode ? " (테스트 모드: 모두 1)" : ""}`,
  );

  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    console.log("\n💡 로컬 서버를 사용합니다.");
    console.log("   로컬 서버가 실행 중인지 확인하세요: npm run dev\n");
  } else {
    console.log("\n⚠️  프로덕션 API를 사용합니다.");
    console.log(
      "   만약 'Invalid type' 에러가 발생하면, 최신 코드가 배포되지 않았을 수 있습니다.",
    );
    console.log("   로컬 서버에서 테스트하려면:");
    console.log("   PFLOW_BASE_URL=http://localhost:3000 node index.js\n");
  }

  const allResults = [];

  // accounts 배열을 순회하면서 각 계정별로 처리
  for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
    const account = accounts[accountIndex];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`계정 ${accountIndex + 1}/${accounts.length}: ${account.id}`);
    console.log("=".repeat(60));

    try {
      // 1. Supabase에서 계정 정보 가져오기
      console.log(`\n[${account.id}] Supabase에서 계정 정보 가져오는 중...`);
      const accountInfoUrl = `${baseUrl}/api/naver/saveToken?id=${account.id}`;
      const accountInfoRes = await fetch(accountInfoUrl);

      if (!accountInfoRes.ok) {
        throw new Error(
          `계정 정보 조회 실패: ${accountInfoRes.status} ${accountInfoRes.statusText}`,
        );
      }

      const accountInfoData = await accountInfoRes.json();

      if (!accountInfoData.success || !accountInfoData.data) {
        throw new Error(`계정 정보를 찾을 수 없습니다: ${account.id}`);
      }

      const accountInfo = accountInfoData.data;
      // account 설정에 types가 있으면 우선 사용, 없으면 DB의 type 사용
      let accountTypes = account.types || [accountInfo.type];

      // 플래그로 타입 필터링
      if (isDomesticOnly || isWorldOnly || isCryptoOnly) {
        accountTypes = accountTypes.filter((type) => {
          if (isDomesticOnly && type === "domestic") return true;
          if (isWorldOnly && type === "world") return true;
          if (isCryptoOnly && type === "crypto") return true;
          return false;
        });
      }

      // 필터링 후 처리할 타입이 없으면 계정 스킵
      if (accountTypes.length === 0) {
        console.log(`[${account.id}] 처리할 타입이 없어 스킵합니다.`);
        continue;
      }
      const accountType = accountInfo.type;
      const accountRefreshToken = accountInfo.refresh_token;

      console.log(
        `[${account.id}] 계정 정보 조회 완료 (type: ${accountTypes.join(", ")})`,
      );

      // 2. refreshToken으로 새 accessToken 받아오기
      console.log(
        `\n[${account.id}] refreshToken으로 새 accessToken 받아오는 중...`,
      );
      const tokenData = await refreshNaverTokenForAccount(accountRefreshToken);
      const accountAccessToken = tokenData.accessToken;
      const newRefreshToken = tokenData.refreshToken || accountRefreshToken;

      console.log(`[${account.id}] 토큰 갱신 완료`);

      // 3. 새 토큰을 Supabase에 저장하기
      console.log(`\n[${account.id}] 새 토큰을 Supabase에 저장하는 중...`);
      const saveTokenUrl = `${baseUrl}/api/naver/saveToken`;
      const saveTokenRes = await fetch(saveTokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: account.id,
          type: accountType,
          access_token: accountAccessToken,
          refresh_token: newRefreshToken,
        }),
      });

      if (!saveTokenRes.ok) {
        const errorData = await saveTokenRes.json().catch(() => ({}));
        throw new Error(
          `토큰 저장 실패: ${saveTokenRes.status} - ${
            errorData.error || saveTokenRes.statusText
          }`,
        );
      }

      const saveTokenData = await saveTokenRes.json();
      if (!saveTokenData.success) {
        throw new Error(
          `토큰 저장 실패: ${saveTokenData.error || "Unknown error"}`,
        );
      }

      console.log(`[${account.id}] 토큰 저장 완료`);

      // 4. 계정의 type에 따라 해당 로직 실행 (복수 타입 지원)
      const accountResults = [];

      for (const type of accountTypes) {
        if (type === "domestic") {
          console.log(`\n[${account.id}] 국내주식 처리 시작...`);
          try {
            const domesticResult = await processStock(
              "domestic",
              "국내주식",
              baseUrl,
              accountAccessToken,
              clubId,
            );
            accountResults.push({
              accountId: account.id,
              accountType: type,
              ...domesticResult,
            });
          } catch (error) {
            console.error(`[${account.id}] 국내주식 처리 실패:`, error);
            accountResults.push({
              accountId: account.id,
              accountType: type,
              success: false,
              type: "stock",
              name: "국내주식",
              stockType: "domestic",
              error: error.message,
            });
          }
        } else if (type === "world") {
          console.log(`\n[${account.id}] 미국주식 처리 시작...`);
          try {
            const worldResult = await processStock(
              "world",
              "미국주식",
              baseUrl,
              accountAccessToken,
              clubId,
            );
            accountResults.push({
              accountId: account.id,
              accountType: type,
              ...worldResult,
            });
          } catch (error) {
            console.error(`[${account.id}] 미국주식 처리 실패:`, error);
            accountResults.push({
              accountId: account.id,
              accountType: type,
              success: false,
              type: "stock",
              name: "미국주식",
              stockType: "world",
              error: error.message,
            });
          }
        } else if (type === "crypto") {
          console.log(`\n[${account.id}] 크립토 처리 시작...`);
          try {
            const cryptoResult = await processCrypto(
              baseUrl,
              accountAccessToken,
              clubId,
            );
            accountResults.push({
              accountId: account.id,
              accountType: type,
              ...cryptoResult,
            });
          } catch (error) {
            console.error(`[${account.id}] 크립토 처리 실패:`, error);
            accountResults.push({
              accountId: account.id,
              accountType: type,
              success: false,
              type: "crypto",
              name: "크립토",
              error: error.message,
            });
          }
        } else {
          console.error(`[${account.id}] 알 수 없는 타입: ${type}`);
          accountResults.push({
            accountId: account.id,
            accountType: type,
            success: false,
            error: `알 수 없는 타입: ${type}`,
          });
        }

        // 타입 간 전환 시 딜레이 (마지막 타입이 아니면 25초 대기)
        if (accountTypes.indexOf(type) < accountTypes.length - 1) {
          console.log(
            `\n[${account.id}] 다음 타입으로 넘어가기 전 25초 대기...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 25000));
        }
      }

      allResults.push(...accountResults);

      // 계정 간 딜레이 (마지막 계정이 아니면)
      if (accountIndex < accounts.length - 1) {
        console.log(`\n[${account.id}] 다음 계정으로 넘어가기 전 30초 대기...`);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    } catch (error) {
      console.error(`[${account.id}] 계정 처리 중 오류 발생:`, error);
      allResults.push({
        accountId: account.id,
        accountType: "unknown",
        success: false,
        error: error.message,
      });
    }
  }

  const results = allResults;

  // 결과 요약
  console.log("\n" + "=".repeat(60));
  console.log("전체 결과 요약");
  console.log("=".repeat(60));

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  // 계정별로 그룹화
  const accountGroups = {};
  results.forEach((result) => {
    const accountId = result.accountId || "unknown";
    if (!accountGroups[accountId]) {
      accountGroups[accountId] = [];
    }
    accountGroups[accountId].push(result);
  });

  console.log(`\n총 작업: ${results.length}개`);
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${failCount}개`);

  // 계정별 결과 출력
  console.log("\n계정별 결과:");
  Object.keys(accountGroups).forEach((accountId) => {
    const accountResults = accountGroups[accountId];
    const accountSuccess = accountResults.filter((r) => r.success).length;
    const accountFail = accountResults.filter((r) => !r.success).length;
    const accountType = accountResults[0]?.accountType || "unknown";

    console.log(`\n  [${accountId}] (${accountType}):`);
    console.log(`    성공: ${accountSuccess}개, 실패: ${accountFail}개`);

    accountResults.forEach((result) => {
      if (result.success) {
        if (result.type === "stock" && result.results) {
          console.log(
            `    - ${result.name}: ${result.successCount}/${result.total} 개별 게시글 성공`,
          );
        } else if (result.type === "crypto") {
          console.log(
            `    - ${result.name}: ${result.successCount}/${result.total} 개별 게시글 성공`,
          );
        }
      } else {
        console.log(
          `    - ${result.name || result.type}: 실패 - ${result.error}`,
        );
      }
    });
  });

  console.log("\n" + "=".repeat(60));
}

// Lambda 핸들러로 사용할 때
exports.handler = async (event) => {
  console.log("Lambda 함수 시작:", JSON.stringify(event, null, 2));

  try {
    await main();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "모든 작업 처리 완료",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Lambda 함수 실행 중 오류 발생:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "작업 처리 중 오류 발생",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// 로컬 테스트용 (직접 실행 시)
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n테스트 완료!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n테스트 중 오류 발생:", error);
      process.exit(1);
    });
}
