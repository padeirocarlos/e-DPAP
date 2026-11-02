package mz.gov.dpap.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.List;

/**
 * Persists a {@code select_multiple} value (a list of code strings, per the BRD
 * data conventions) as a single comma-separated {@code text} column. Keeps the
 * schema portable and the JPA entity simple while the wire contract exchanges a
 * JSON array of codes. Null or empty ⇄ null column.
 */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        return String.join(",", attribute);
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return List.of();
        return Arrays.stream(dbData.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
