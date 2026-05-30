package com.DuyHao.post_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.GeoIp2Exception;
import com.maxmind.geoip2.model.CityResponse;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class GeoIpService {

    private DatabaseReader dbReader;
    private HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String UNKNOWN_CITY = "Unknown";
    private static final String MMDB_PATH = "GeoLite2-City.mmdb";

    @Value("${app.geo.ipinfo-token:}")
    private String ipinfoToken;

    @Value("${app.geo.dev-fallback-ip:}")
    private String devFallbackIp;

    @PostConstruct
    public void init() {
        // Load GeoLite2 database
        try {
            InputStream stream = new ClassPathResource(MMDB_PATH).getInputStream();
            dbReader = new DatabaseReader.Builder(stream).build();
            log.info("GeoIP2 database loaded successfully");
        } catch (IOException e) {
            log.warn("GeoIP2 database not found at '{}'. Will rely on IPinfo.io only.", MMDB_PATH);
        }

        // Init HTTP client cho IPinfo (timeout 3s)
        httpClient =
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    // Resolve city từ IP gọi song song GeoLite2 + IPinfo.io
    public String resolveCity(String ip) {
        if (ip == null || ip.isBlank() || isPrivateIp(ip)) {
            // Nếu là private IP và có dev-fallback-ip → dùng IP giả để test local
            if (devFallbackIp != null && !devFallbackIp.isBlank()) {
                log.debug("Private IP detected: {}, using dev-fallback-ip: {}", ip, devFallbackIp);
                ip = devFallbackIp;
            } else {
                log.debug("Private/blank IP: {}, returning Unknown", ip);
                return UNKNOWN_CITY;
            }
        }

        final String resolvedIp = ip;

        // Gọi song song 2 nguồn
        CompletableFuture<String> geoLiteFuture = CompletableFuture.supplyAsync(() -> resolveFromGeoLite2(resolvedIp));

        CompletableFuture<String> ipinfoFuture = CompletableFuture.supplyAsync(() -> resolveFromIpInfo(resolvedIp));

        String geoLiteResult = geoLiteFuture.join();
        String ipinfoResult = ipinfoFuture.join();

        log.info(
                "IP={} | GeoLite2={} | IPinfo={} | Final={}",
                resolvedIp,
                geoLiteResult,
                ipinfoResult,
                !UNKNOWN_CITY.equals(ipinfoResult) ? ipinfoResult : geoLiteResult);

        // IPinfo thành công → luôn ưu tiên IPinfo
        if (!UNKNOWN_CITY.equals(ipinfoResult)) {
            return ipinfoResult;
        }

        // IPinfo thất bại → fallback GeoLite2
        return geoLiteResult;
    }

    //  Resolve từ GeoLite2
    private String resolveFromGeoLite2(String ip) {
        if (dbReader == null) return UNKNOWN_CITY;
        try {
            InetAddress inetAddress = InetAddress.getByName(ip.trim());
            CityResponse response = dbReader.city(inetAddress);

            // Ưu tiên 1: City
            String city = response.getCity().getName();
            if (city != null && !city.isBlank()) return city;

            // Ưu tiên 2: Subdivision (tỉnh/thành)
            if (!response.getSubdivisions().isEmpty()) {
                String subdivision = response.getSubdivisions().get(0).getName();
                if (subdivision != null && !subdivision.isBlank()) return subdivision;
            }

            // Ưu tiên 3: Country
            String country = response.getCountry().getName();
            if (country != null && !country.isBlank()) return country;

            return UNKNOWN_CITY;
        } catch (IOException | GeoIp2Exception e) {
            log.debug("GeoLite2 failed for IP {}: {}", ip, e.getMessage());
            return UNKNOWN_CITY;
        }
    }

    // Resolve từ IPinfo.io API
    private String resolveFromIpInfo(String ip) {
        if (ipinfoToken == null || ipinfoToken.isBlank()) {
            log.debug("IPinfo token not configured, skipping");
            return UNKNOWN_CITY;
        }

        try {
            String url = "https://ipinfo.io/" + ip + "?token=" + ipinfoToken;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 429) {
                log.warn("IPinfo rate limit exceeded");
                return UNKNOWN_CITY;
            }

            if (response.statusCode() != 200) {
                log.debug("IPinfo returned status {}", response.statusCode());
                return UNKNOWN_CITY;
            }

            JsonNode json = objectMapper.readTree(response.body());

            // Ưu tiên city, fallback region
            JsonNode cityNode = json.get("city");
            if (cityNode != null && !cityNode.asText().isBlank()) {
                return cityNode.asText();
            }

            JsonNode regionNode = json.get("region");
            if (regionNode != null && !regionNode.asText().isBlank()) {
                return regionNode.asText();
            }

            return UNKNOWN_CITY;
        } catch (Exception e) {
            log.debug("IPinfo failed for IP {}: {}", ip, e.getMessage());
            return UNKNOWN_CITY;
        }
    }

    // Lấy IP thật của client từ header X-Client-IP
    public String extractClientIp(String xClientIp, String xForwardedFor, String remoteAddr) {
        if (xClientIp != null && !xClientIp.isBlank()) return xClientIp.trim();
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return remoteAddr != null ? remoteAddr.trim() : "";
    }

    private boolean isPrivateIp(String ip) {
        return ip.startsWith("127.")
                || ip.startsWith("192.168.")
                || ip.startsWith("10.")
                || ip.startsWith("169.254.")
                || ip.equals("0:0:0:0:0:0:0:1")
                || ip.equals("::1");
    }
}
