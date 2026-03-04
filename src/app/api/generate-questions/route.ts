import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const DIFFICULTY_LABELS: Record<string, string> = {
    easy: 'dễ (dành cho học sinh lớp 3-4, khái niệm cơ bản)',
    medium: 'vừa (dành cho học sinh lớp 5, cần hiểu biết vừa phải)',
    hard: 'khó (kiến thức chuyên sâu, số liệu cụ thể)',
};

export async function POST(req: NextRequest) {
    try {
        const { difficulty = 'easy', count = 10 } = await req.json();

        // If no API key, return fallback mock questions
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ questions: getFallbackQuestions(difficulty, count) });
        }

        const prompt = `Bạn là một người dẫn chương trình trò chơi vui nhộn dành cho trẻ em mầm non và tiểu học tại Việt Nam.

Hãy tạo ${count} câu hỏi ở cấp độ ${DIFFICULTY_LABELS[difficulty] || 'dễ'} về chủ đề kiến thức tổng hợp, động vật, thực vật, màu sắc, thế giới tự nhiên, năng lượng xanh, và những câu đố vui sinh động nhí nhảnh.

Yêu cầu:
- Câu hỏi bằng tiếng Việt, rất phù hợp học sinh tiểu học, ngôn từ sinh động, vui tươi, gợi sự tò mò.
- Mỗi câu có 4 đáp án (A, B, C, D) và chỉ 1 đáp án đúng
- Có giải thích ngắn gọn, dễ thương, khen ngợi bé (1-2 câu)
- Các câu hỏi phải KHÁC NHAU, đa dạng chủ đề (thế giới động vật, khoa học vui, đố chữ dễ, năng lượng bảo vệ môi trường, v.v.)
- Trả về danh sách câu hỏi bao gồm 2 loại (type): "multiple-choice" (trắc nghiệm thông thường) và "drag-drop" (điền vào chỗ trống).
  - Với câu hỏi "drag-drop", trong phần text câu hỏi phải có chỗ trống được biểu diễn bằng "___" (3 dấu gạch dưới). Ví dụ: "Chú thỏ thích ăn củ ___ nhất nè!"

Trả về JSON thuần túy (không có markdown, không có backtick) theo đúng format sau:
{"questions":[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0,"explanation":"...","topic":"khoa_hoc_vui/dong_vat/thuc_vat/moi_truong","type":"multiple-choice"}]}

Lưu ý: correctIndex là 0-3 (index của đáp án đúng trong mảng options). type phải là "multiple-choice" hoặc "drag-drop".`;

        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 4096,
                },
            }),
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status, response.statusText);
            return NextResponse.json({ questions: getFallbackQuestions(difficulty, count) });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        // Parse JSON — strip any markdown code fences if present
        const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        let parsed: { questions: AIQuestion[] };
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse Gemini response:', cleaned.slice(0, 300));
            return NextResponse.json({ questions: getFallbackQuestions(difficulty, count) });
        }

        // Validate and sanitize
        const questions = (parsed.questions || [])
            .filter((q: AIQuestion) => q.question && Array.isArray(q.options) && q.options.length === 4)
            .slice(0, count)
            .map((q: AIQuestion) => ({
                question: q.question,
                options: q.options,
                correctIndex: Number(q.correctIndex) || 0,
                explanation: q.explanation || '',
                topic: q.topic || 'general',
                difficulty,
                type: q.type === 'drag-drop' ? 'drag-drop' : 'multiple-choice',
            }));

        if (questions.length < count) {
            // Pad with fallback if AI returned fewer
            const fallback = getFallbackQuestions(difficulty, count - questions.length);
            return NextResponse.json({ questions: [...questions, ...fallback] });
        }

        return NextResponse.json({ questions });
    } catch (err) {
        console.error('generate-questions error:', err);
        return NextResponse.json({ questions: getFallbackQuestions('easy', 10) });
    }
}

interface AIQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
    difficulty?: string;
    type?: 'multiple-choice' | 'drag-drop';
}

// Fallback questions when Gemini is unavailable
function getFallbackQuestions(difficulty: string, count: number): AIQuestion[] {
    const pool: AIQuestion[] = [
        { question: 'Năng lượng mặt trời được chuyển thành điện nhờ thiết bị nào?', options: ['A. Tuabin gió', 'B. Pin mặt trời', 'C. Máy phát diesel', 'D. Thủy điện'], correctIndex: 1, explanation: 'Pin mặt trời (solar panel) chuyển đổi ánh sáng thành điện năng thông qua hiệu ứng quang điện.', topic: 'solar', difficulty: 'easy', type: 'multiple-choice' },
        { question: 'CO2 trong khí quyển gây ra hiện tượng gì?', options: ['A. Mưa axit', 'B. Hiệu ứng nhà kính', 'C. Cầu vồng', 'D. Thủy triều'], correctIndex: 1, explanation: 'CO2 và các khí nhà kính giữ nhiệt trong khí quyển, gây nóng lên toàn cầu.', topic: 'general', difficulty: 'easy', type: 'multiple-choice' },
        { question: 'Đèn LED so với đèn sợi đốt thì tiết kiệm điện hơn ___%.', options: ['A. 20', 'B. 50', 'C. 80', 'D. 10'], correctIndex: 2, explanation: 'Đèn LED tiết kiệm khoảng 80% điện so với đèn sợi đốt truyền thống.', topic: 'energy_saving', difficulty: 'easy', type: 'drag-drop' },
        { question: 'Tuabin gió chuyển đổi động năng của gió thành ___.', options: ['A. Nhiệt năng', 'B. Quang năng', 'C. Điện năng', 'D. Hóa năng'], correctIndex: 2, explanation: 'Tuabin gió chuyển đổi động năng của gió thành điện năng qua máy phát điện.', topic: 'wind', difficulty: 'easy', type: 'drag-drop' },
        { question: 'Năng lượng tái tạo là loại năng lượng như thế nào?', options: ['A. Từ than đá và dầu mỏ', 'B. Tự bổ sung từ thiên nhiên', 'C. Từ lò hạt nhân', 'D. Từ khí ga'], correctIndex: 1, explanation: 'Năng lượng tái tạo đến từ nguồn tự nhiên tự phục hồi như mặt trời, gió, nước.', topic: 'general', difficulty: 'easy', type: 'multiple-choice' },
        { question: 'Thiết bị nào tiêu thụ điện nhiều nhất trong gia đình?', options: ['A. Đèn LED', 'B. Điều hòa không khí', 'C. Tivi', 'D. Sạc điện thoại'], correctIndex: 1, explanation: 'Điều hòa chiếm 40-60% điện gia đình, do công suất lớn và chạy liên tục.', topic: 'energy_saving', difficulty: 'easy', type: 'multiple-choice' },
        { question: 'Xe điện giúp giảm ___ khi chạy trên đường.', options: ['A. Khí thải CO2', 'B. Tốc độ', 'C. Nước', 'D. Sự an toàn'], correctIndex: 0, explanation: 'Xe điện không thải CO2 trực tiếp. Nếu sạc bằng điện tái tạo, phát thải gần bằng 0.', topic: 'general', difficulty: 'easy', type: 'drag-drop' },
        { question: 'Hiệu suất trung bình của pin mặt trời thương mại hiện nay là bao nhiêu?', options: ['A. 5-10%', 'B. 15-22%', 'C. 40-50%', 'D. 60-70%'], correctIndex: 1, explanation: 'Pin mặt trời thương mại thường đạt hiệu suất 15-22%.', topic: 'solar', difficulty: 'medium', type: 'multiple-choice' },
        { question: 'Mục tiêu của Thỏa thuận Paris là giữ nhiệt độ không tăng quá ___ độ C.', options: ['A. 0.5-1', 'B. 1.5-2', 'C. 3-4', 'D. 5-6'], correctIndex: 1, explanation: 'Thỏa thuận Paris (2015) đặt mục tiêu hạn chế nhiệt độ tăng không quá 1.5-2°C.', topic: 'general', difficulty: 'medium', type: 'drag-drop' },
        { question: 'Năng lượng địa nhiệt lấy nhiệt lượng từ ___.', options: ['A. Mặt trời', 'B. Lõi Trái Đất', 'C. Thực vật', 'D. Không khí'], correctIndex: 1, explanation: 'Năng lượng địa nhiệt lấy từ nhiệt lõi Trái Đất qua suối nước nóng, hơi đất.', topic: 'general', difficulty: 'medium', type: 'drag-drop' },
        { question: 'Thủy điện lớn nhất Việt Nam là nhà máy nào?', options: ['A. Hòa Bình', 'B. Sơn La', 'C. Lai Châu', 'D. Trị An'], correctIndex: 1, explanation: 'Thủy điện Sơn La (2400 MW) là nhà máy thủy điện lớn nhất Việt Nam.', topic: 'hydro', difficulty: 'medium', type: 'multiple-choice' },
        { question: 'Điện gió ngoài khơi có ưu điểm gì?', options: ['A. Rẻ hơn nhiều', 'B. Gió ổn định và mạnh hơn', 'C. Không cần bảo trì', 'D. Hiệu suất thấp'], correctIndex: 1, explanation: 'Gió ngoài khơi mạnh và ổn định hơn trên đất liền vì ít bị cản trở địa hình.', topic: 'wind', difficulty: 'medium', type: 'multiple-choice' },
        { question: 'Việt Nam có tiềm năng điện mặt trời lớn nhất ở vùng ___ và Tây Nguyên.', options: ['A. Tây Bắc', 'B. Đồng bằng sông Hồng', 'C. Nam Trung Bộ', 'D. Đồng bằng sông Cửu Long'], correctIndex: 2, explanation: 'Ninh Thuận, Bình Thuận và Nam Trung Bộ, Tây Nguyên có số giờ nắng cao nhất.', topic: 'solar', difficulty: 'hard', type: 'drag-drop' },
        { question: 'Thủy điện chiếm khoảng ___ tổng sản lượng điện Việt Nam.', options: ['A. 10-15%', 'B. 30-40%', 'C. 55-60%', 'D. 80-90%'], correctIndex: 1, explanation: 'Thủy điện chiếm khoảng 30-40% tổng sản lượng điện Việt Nam.', topic: 'hydro', difficulty: 'hard', type: 'drag-drop' },
        { question: 'Sinh khối (biomass) tạo năng lượng bằng cách nào?', options: ['A. Đốt hoặc lên men thành biogas', 'B. Chiết xuất dầu và đốt', 'C. Phơi nắng lấy năng lượng', 'D. Dùng từ tính thực vật'], correctIndex: 0, explanation: 'Sinh khối có thể đốt trực tiếp hoặc lên men tạo biogas, hoặc chuyển thành biofuel.', topic: 'general', difficulty: 'hard', type: 'multiple-choice' },
    ];

    const filtered = difficulty === 'easy'
        ? pool.filter(q => q.difficulty === 'easy')
        : difficulty === 'medium'
            ? pool.filter(q => q.difficulty !== 'hard')
            : pool;

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}
