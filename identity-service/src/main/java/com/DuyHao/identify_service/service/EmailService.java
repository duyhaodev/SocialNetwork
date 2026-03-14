package com.DuyHao.identify_service.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@threads.com}")
    private String fromEmail;

    @Async
    public void sendVerificationEmail(String to, String verificationCode) {
        // 1. Log ra console để dev test nhanh
        log.info("========================================");
        log.info("MOCK EMAIL TO: {}", to);
        log.info("VERIFICATION CODE: {}", verificationCode);
        log.info("========================================");

        // 2. Gửi mail thật (HTML format)
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Threads - Verify your email");

            String htmlContent = buildHtmlContent(verificationCode);
            helper.setText(htmlContent, true); // true = isHtml

            mailSender.send(message);
            log.info("HTML Email sent successfully to {}", to);
        } catch (MessagingException e) {
            log.warn("Could not send email (checking SMTP config...): {}", e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending email: {}", e.getMessage());
        }
    }

    private String buildHtmlContent(String code) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset=\"UTF-8\">" +
                "<style>" +
                "  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #000000; margin: 0; padding: 0; }" +
                "  .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; text-align: center; }" +
                "  .header { font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: -1px; }" +
                "  .content { font-size: 16px; line-height: 1.5; color: #333333; margin-bottom: 30px; }" +
                "  .code-box { background-color: #f5f5f5; border-radius: 12px; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0; display: inline-block; width: 100%; box-sizing: border-box; }" +
                "  .footer { font-size: 12px; color: #999999; margin-top: 40px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "  <div class=\"container\">" +
                "    <div class=\"header\">Threads</div>" +
                "    <div class=\"content\">" +
                "      <p>Hello,</p>" +
                "      <p>Use the verification code below to complete your sign up.</p>" +
                "    </div>" +
                "    <div class=\"code-box\">" +
                "      " + code +
                "    </div>" +
                "    <div class=\"content\">" +
                "      <p>This code will expire in 5 minutes.</p>" +
                "    </div>" +
                "    <div class=\"footer\">" +
                "      <p>© 2026 Threads Clone. All rights reserved.</p>" +
                "    </div>" +
                "  </div>" +
                "</body>" +
                "</html>";
    }
}
