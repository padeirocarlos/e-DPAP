package mz.gov.dpap.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import mz.gov.dpap.domain.Actor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

/**
 * Builds actor exports in CSV, XLSX and PDF. CSV/XLSX carry all columns; the PDF
 * is a readable summary (fewer columns to fit the page).
 */
@Service
public class ReportService {

    public enum Format {
        CSV("text/csv", "csv"),
        XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
        PDF("application/pdf", "pdf");

        public final String contentType;
        public final String extension;

        Format(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        public static Format fromString(String value) {
            if (value == null) return CSV;
            return switch (value.toLowerCase()) {
                case "xlsx" -> XLSX;
                case "pdf" -> PDF;
                default -> CSV;
            };
        }
    }

    /** An exportable column: stable key, Portuguese header, value extractor. */
    public record Column(String key, String header, java.util.function.Function<Actor, String> get) {}

    private static String join(List<String> v) {
        return v == null ? "" : String.join("; ", v);
    }

    /** Canonical column order. The frontend offers these keys for selection. */
    public static final List<Column> COLUMNS = List.of(
        new Column("name", "Nome", Actor::getName),
        new Column("registrationNumber", "Nº de registo", a -> nz(a.getRegistrationNumber())),
        new Column("acronym", "Sigla", a -> nz(a.getAcronym())),
        new Column("actorType", "Tipo", a -> a.getActorType().name()),
        new Column("legalStatus", "Estatuto legal", a -> a.getLegalStatus().name()),
        new Column("sector", "Setor", a -> a.getSector().name()),
        new Column("district", "Distrito", Actor::getDistrictCode),
        new Column("administrativePost", "Posto administrativo", Actor::getAdministrativePostCode),
        new Column("locality", "Localidade", a -> nz(a.getLocalityCode())),
        new Column("latitude", "Latitude", a -> String.valueOf(a.getLatitude())),
        new Column("longitude", "Longitude", a -> String.valueOf(a.getLongitude())),
        new Column("responsiblePerson", "Responsável", a -> nz(a.getResponsiblePerson())),
        new Column("respondentSex", "Sexo do respondente", a -> nz(a.getRespondentSex())),
        new Column("respondentAge", "Idade do respondente",
            a -> a.getRespondentAge() == null ? "" : a.getRespondentAge().toString()),
        new Column("phone", "Telemóvel", a -> nz(a.getPhone())),
        new Column("phoneAlt", "Telefone alternativo", a -> nz(a.getPhoneAlt())),
        new Column("email", "Email", a -> nz(a.getEmail())),
        new Column("website", "Website", a -> nz(a.getWebsite())),
        new Column("address", "Endereço", a -> nz(a.getAddress())),
        new Column("operationLevel", "Nível de actuação", a -> nz(a.getOperationLevel())),
        new Column("legalFormality", "Situação legal", a -> nz(a.getLegalFormality())),
        new Column("nuit", "NUIT", a -> nz(a.getNuit())),
        new Column("subsectors", "Subsectores", a -> join(a.getSubsectors())),
        new Column("valueChainLinks", "Elos da cadeia de valor", a -> join(a.getValueChainLinks())),
        new Column("startDate", "Data de início",
            a -> a.getStartDate() == null ? "" : a.getStartDate().toString()),
        new Column("fundingType", "Tipo de financiamento",
            a -> a.getFundingType() == null ? "" : a.getFundingType().name()),
        new Column("fundingSources", "Fontes de financiamento", a -> join(a.getFundingSources())),
        new Column("description", "Descrição", a -> nz(a.getDescription())),
        new Column("observations", "Observações", a -> nz(a.getObservations())),
        new Column("imageUrl", "Imagem", a -> nz(a.getImageUrl()))
    );

    /** Select columns by key (canonical order preserved); null/empty = all. */
    private static List<Column> select(List<String> keys) {
        if (keys == null || keys.isEmpty()) return COLUMNS;
        java.util.Set<String> want = new java.util.HashSet<>(keys);
        List<Column> chosen = COLUMNS.stream().filter(c -> want.contains(c.key())).toList();
        return chosen.isEmpty() ? COLUMNS : chosen;
    }

    private static final String[] PDF_HEADERS = {
        "Nome", "Tipo", "Setor", "Distrito", "Responsável", "Telemóvel"
    };

    public byte[] generate(Format format, List<Actor> actors, List<String> columns) {
        List<Column> cols = select(columns);
        return switch (format) {
            case CSV -> csv(actors, cols);
            case XLSX -> xlsx(actors, cols);
            case PDF -> pdf(actors); // summary layout, fixed columns
        };
    }

    // --- CSV ---
    private byte[] csv(List<Actor> actors, List<Column> cols) {
        StringBuilder sb = new StringBuilder("﻿"); // BOM for Excel/accents
        appendCsvRow(sb, cols.stream().map(Column::header).toArray(String[]::new));
        for (Actor a : actors) {
            appendCsvRow(sb, cols.stream().map(c -> c.get().apply(a)).toArray(String[]::new));
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static void appendCsvRow(StringBuilder sb, String[] cells) {
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) sb.append(',');
            sb.append('"').append(cells[i].replace("\"", "\"\"")).append('"');
        }
        sb.append("\r\n");
    }

    // --- XLSX ---
    private byte[] xlsx(List<Actor> actors, List<Column> cols) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Atores");

            CellStyle headerStyle = wb.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row header = sheet.createRow(0);
            for (int c = 0; c < cols.size(); c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(cols.get(c).header());
                cell.setCellStyle(headerStyle);
            }

            int r = 1;
            for (Actor a : actors) {
                Row row = sheet.createRow(r++);
                for (int c = 0; c < cols.size(); c++) {
                    row.createCell(c).setCellValue(cols.get(c).get().apply(a));
                }
            }
            for (int c = 0; c < cols.size(); c++) {
                sheet.autoSizeColumn(c);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // --- PDF ---
    private byte[] pdf(List<Actor> actors) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        PdfWriter.getInstance(doc, out);
        doc.open();

        Paragraph title = new Paragraph(
                "DPAP Maputo — Cadastro de atores",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14));
        title.setSpacingAfter(12f);
        doc.add(title);

        PdfPTable table = new PdfPTable(PDF_HEADERS.length);
        table.setWidthPercentage(100);
        for (String h : PDF_HEADERS) {
            PdfPCell cell = new PdfPCell(new Phrase(h,
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }
        for (Actor a : actors) {
            String[] row = {
                a.getName(), a.getActorType().name(), a.getSector().name(),
                a.getDistrictCode(), nz(a.getResponsiblePerson()), nz(a.getPhone())
            };
            for (String value : row) {
                table.addCell(new Phrase(value, FontFactory.getFont(FontFactory.HELVETICA, 8)));
            }
        }
        doc.add(table);
        doc.close();
        return out.toByteArray();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
