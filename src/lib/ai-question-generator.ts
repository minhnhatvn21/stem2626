import { AIGeneratedQuestion, AIQuestionRequest, Difficulty } from '@/types/question';

/**
 * AI Question Generator
 * Currently uses a mock implementation with sample questions.
 * To integrate real AI (Gemini/GPT), replace `callAIAPI` with your API call.
 */

// Mock data pool for demo
const MOCK_QUESTIONS: Record<string, AIGeneratedQuestion[]> = {
    solar: [
        {
            question: 'Năng lượng mặt trời được chuyển đổi thành điện năng bằng thiết bị nào?',
            options: ['Tuabin gió', 'Pin mặt trời (Solar panel)', 'Máy phát điện diesel', 'Pin nhiên liệu hydro'],
            correctIndex: 1,
            explanation: 'Pin mặt trời (tấm quang điện) chuyển đổi ánh sáng mặt trời thành điện năng thông qua hiệu ứng quang điện.',
            difficulty: 'easy',
            topic: 'solar',
        },
        {
            question: 'Hiệu suất trung bình của pin mặt trời thương mại hiện nay là bao nhiêu?',
            options: ['5-10%', '15-22%', '40-50%', '60-70%'],
            correctIndex: 1,
            explanation: 'Pin mặt trời thương mại hiện đại thường đạt hiệu suất từ 15-22%, một số loại cao cấp có thể đạt 25%.',
            difficulty: 'medium',
            topic: 'solar',
        },
        {
            question: 'Việt Nam có tiềm năng điện mặt trời lớn nhất ở vùng nào?',
            options: ['Tây Bắc', 'Đồng bằng sông Hồng', 'Nam Trung Bộ và Tây Nguyên', 'Đồng bằng sông Cửu Long'],
            correctIndex: 2,
            explanation: 'Nam Trung Bộ (Ninh Thuận, Bình Thuận) và Tây Nguyên có số giờ nắng cao nhất Việt Nam, lý tưởng cho điện mặt trời.',
            difficulty: 'medium',
            topic: 'solar',
        },
    ],
    wind: [
        {
            question: 'Tuabin gió hoạt động dựa trên nguyên lý nào?',
            options: ['Chuyển hóa nhiệt năng thành điện', 'Chuyển hóa động năng của gió thành điện', 'Chuyển hóa ánh sáng thành điện', 'Chuyển hóa hóa năng thành điện'],
            correctIndex: 1,
            explanation: 'Tuabin gió chuyển đổi động năng của gió thành cơ năng quay cánh, sau đó máy phát điện chuyển thành điện năng.',
            difficulty: 'easy',
            topic: 'wind',
        },
        {
            question: 'Điện gió ngoài khơi có ưu điểm gì so với điện gió trên đất liền?',
            options: ['Rẻ hơn nhiều', 'Gió mạnh và ổn định hơn', 'Không cần bảo trì', 'Hiệu suất thấp hơn'],
            correctIndex: 1,
            explanation: 'Gió ngoài khơi thường mạnh hơn, đều hơn và ít bị cản trở bởi địa hình so với trên đất liền.',
            difficulty: 'medium',
            topic: 'wind',
        },
    ],
    energy_saving: [
        {
            question: 'Thiết bị nào tiêu thụ điện nhiều nhất trong gia đình thông thường?',
            options: ['Bóng đèn LED', 'Điều hòa không khí', 'Tivi', 'Sạc điện thoại'],
            correctIndex: 1,
            explanation: 'Điều hòa không khí thường chiếm 40-60% tổng tiêu thụ điện của gia đình, do hoạt động liên tục và công suất lớn.',
            difficulty: 'easy',
            topic: 'energy_saving',
        },
        {
            question: 'Đèn LED tiết kiệm điện hơn đèn sợi đốt bao nhiêu lần?',
            options: ['2 lần', '5 lần', '8 lần', '15 lần'],
            correctIndex: 2,
            explanation: 'Đèn LED tiêu thụ ít hơn khoảng 80-90% điện so với đèn sợi đốt truyền thống để cho cùng độ sáng.',
            difficulty: 'easy',
            topic: 'energy_saving',
        },
        {
            question: 'Hành tinh nào có nhiều tiềm năng gió nhất trong hệ mặt trời?',
            options: ['Trái Đất', 'Sao Mộc', 'Hải Vương Tinh', 'Sao Thổ'],
            correctIndex: 2,
            explanation: 'Hải Vương tinh có gió mạnh nhất trong hệ mặt trời, đạt tốc độ 2100 km/h, nhưng con người chưa thể khai thác.',
            difficulty: 'hard',
            topic: 'energy_saving',
        },
    ],
    hydro: [
        {
            question: 'Thủy điện chiếm bao nhiêu phần trăm sản lượng điện của Việt Nam?',
            options: ['10-15%', '30-40%', '55-60%', '80-90%'],
            correctIndex: 1,
            explanation: 'Thủy điện chiếm khoảng 30-40% tổng sản lượng điện của Việt Nam, là nguồn điện tái tạo lớn nhất.',
            difficulty: 'hard',
            topic: 'hydro',
        },
        {
            question: 'Nhà máy thủy điện lớn nhất Việt Nam là nhà máy nào?',
            options: ['Thủy điện Hòa Bình', 'Thủy điện Sơn La', 'Thủy điện Lai Châu', 'Thủy điện Trị An'],
            correctIndex: 1,
            explanation: 'Thủy điện Sơn La với công suất 2400 MW là nhà máy thủy điện lớn nhất Việt Nam, hoàn thành năm 2012.',
            difficulty: 'medium',
            topic: 'hydro',
        },
    ],
    general: [
        {
            question: 'Năng lượng tái tạo (renewable energy) là gì?',
            options: [
                'Năng lượng từ than đá và dầu mỏ',
                'Năng lượng từ nguồn tự nhiên tự bổ sung liên tục',
                'Năng lượng từ lò phản ứng hạt nhân',
                'Năng lượng từ khí ga tự nhiên',
            ],
            correctIndex: 1,
            explanation: 'Năng lượng tái tạo đến từ các nguồn tự nhiên tự phục hồi như mặt trời, gió, nước, địa nhiệt, và sinh khối.',
            difficulty: 'easy',
            topic: 'general',
        },
        {
            question: 'CO2 trong khí quyển gây ra hiện tượng gì?',
            options: ['Hiệu ứng mưa axit', 'Hiệu ứng nhà kính', 'Hiệu ứng cầu vồng', 'Hiệu ứng lỗ thủng tầng ozon'],
            correctIndex: 1,
            explanation: 'CO2 và các khí nhà kính giữ nhiệt trong khí quyển, gây nóng lên toàn cầu - được gọi là hiệu ứng nhà kính.',
            difficulty: 'easy',
            topic: 'general',
        },
        {
            question: 'Mục tiêu của thỏa thuận Paris là gì?',
            options: [
                'Loại bỏ hoàn toàn năng lượng hóa thạch vào 2030',
                'Giữ nhiệt độ Trái Đất tăng không quá 1.5-2°C so với thời tiền công nghiệp',
                'Đạt 100% điện tái tạo trên toàn cầu vào 2050',
                'Cấm sản xuất xe chạy xăng',
            ],
            correctIndex: 1,
            explanation: 'Thỏa thuận Paris (2015) đặt mục tiêu hạn chế nhiệt độ Trái Đất tăng không quá 1.5-2°C so với mức tiền công nghiệp.',
            difficulty: 'medium',
            topic: 'general',
        },
        {
            question: 'Năng lượng địa nhiệt đến từ đâu?',
            options: ['Ánh sáng mặt trời được lưu trữ trong đất', 'Nhiệt bên trong lòng Trái Đất', 'Nhiệt sinh ra từ thực vật phân hủy', 'Nhiệt từ không khí'],
            correctIndex: 1,
            explanation: 'Năng lượng địa nhiệt có nguồn gốc từ nhiệt lõi Trái Đất, được khai thác từ suối nước nóng, mạch nước phun và hơi đất.',
            difficulty: 'medium',
            topic: 'general',
        },
        {
            question: 'Xe điện giúp giảm ô nhiễm như thế nào?',
            options: [
                'Không tạo ra khí thải CO2 trực tiếp khi vận hành',
                'Sử dụng ít nhiên liệu hơn xe xăng',
                'Chạy chậm hơn nên ít ô nhiễm',
                'Sử dụng nước làm nhiên liệu',
            ],
            correctIndex: 0,
            explanation: 'Xe điện không thải CO2 trực tiếp khi vận hành. Nếu sạc bằng điện tái tạo, mức phát thải gần bằng 0.',
            difficulty: 'easy',
            topic: 'general',
        },
        {
            question: 'Sinh khối (biomass) được sử dụng như thế nào để tạo ra năng lượng?',
            options: [
                'Đốt trực tiếp hoặc chuyển đổi thành khí biogas',
                'Chiết xuất dầu và đốt',
                'Phơi dưới ánh nắng để lấy năng lượng',
                'Sử dụng từ tính của thực vật',
            ],
            correctIndex: 0,
            explanation: 'Sinh khối có thể đốt trực tiếp để tạo nhiệt, hoặc lên men tạo biogas, hoặc chuyển thành biofuel.',
            difficulty: 'medium',
            topic: 'general',
        },
    ],
};

async function callAIAPI(request: AIQuestionRequest): Promise<AIGeneratedQuestion[]> {
    // === PLACEHOLDER: Replace with real Gemini/OpenAI API call ===
    // Example Gemini integration:
    // const response = await fetch('/api/generate-questions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request),
    // });
    // const data = await response.json();
    // return data.questions;

    // Mock: return sample questions filtered by topic/difficulty
    await new Promise(resolve => setTimeout(resolve, 1500)); // simulate API delay

    const topicKey = request.topic.toLowerCase().includes('gió') ? 'wind'
        : request.topic.toLowerCase().includes('mặt trời') ? 'solar'
            : request.topic.toLowerCase().includes('tiết kiệm') ? 'energy_saving'
                : request.topic.toLowerCase().includes('thủy') ? 'hydro'
                    : 'general';

    const pool = [...(MOCK_QUESTIONS[topicKey] || []), ...MOCK_QUESTIONS.general];
    const filtered = pool.filter(q =>
        request.difficulty === 'easy' ? q.difficulty === 'easy'
            : request.difficulty === 'medium' ? q.difficulty !== 'hard'
                : true
    );

    // Shuffle and take requested count
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(request.count, shuffled.length));
}

export async function generateQuestionsAI(request: AIQuestionRequest): Promise<AIGeneratedQuestion[]> {
    return callAIAPI(request);
}
