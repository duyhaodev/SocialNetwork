package com.DuyHao.profile_service.util;

import java.text.Normalizer;

public class TextNormalizer {
    public static String normalize(String text) {
        if (text == null) return "";
        String result = Normalizer.normalize(text, Normalizer.Form.NFD);
        result = result.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        result = result.replace("đ", "d").replace("Đ", "D");
        return result.toLowerCase();
    }
}
